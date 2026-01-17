"""Swarm Aggregation Server.

Receives telemetry from IoT nodes via MQTT or HTTP.
LLM-generated handlers go in ./scripts/ and are auto-imported.

Run locally:
    pip install -r requirements.txt
    python main.py

Environment variables:
    SWARM_ID - Swarm identifier (default: "local")
    MQTT_BROKER - MQTT broker host (default: "localhost")
    MQTT_PORT - MQTT broker port (default: 1883)
    HTTP_PORT - HTTP API port (default: 8080)
"""
import json
import os
import importlib.util
from pathlib import Path
from datetime import datetime
from threading import Thread

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import paho.mqtt.client as mqtt
import uvicorn

SWARM_ID = os.getenv("SWARM_ID", "local")
MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
HTTP_PORT = int(os.getenv("HTTP_PORT", "8080"))
SCRIPTS_DIR = Path(__file__).parent / "scripts"

app = FastAPI(title=f"Swarm Aggregation Server - {SWARM_ID}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage (LLM scripts can use this)
telemetry_store: dict[str, list[dict]] = {}
node_status: dict[str, dict] = {}
alerts: list[dict] = []

# Custom handlers loaded from scripts
custom_handlers: dict[str, callable] = {}

# MQTT client (initialized later)
mqtt_client: mqtt.Client = None


class TelemetryPayload(BaseModel):
    timestamp: int | None = None
    readings: dict


def load_custom_scripts():
    """Load LLM-generated scripts from ./scripts/"""
    global custom_handlers
    custom_handlers = {}

    if not SCRIPTS_DIR.exists():
        SCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
        return

    for script_path in SCRIPTS_DIR.glob("*.py"):
        if script_path.name.startswith("_"):
            continue
        try:
            spec = importlib.util.spec_from_file_location(
                script_path.stem, script_path
            )
            module = importlib.util.module_from_spec(spec)
            # Inject globals for scripts to use
            module.telemetry_store = telemetry_store
            module.node_status = node_status
            module.alerts = alerts
            module.mqtt_client = mqtt_client
            module.SWARM_ID = SWARM_ID
            spec.loader.exec_module(module)

            # Register handlers
            if hasattr(module, "on_telemetry"):
                custom_handlers["on_telemetry"] = module.on_telemetry
            if hasattr(module, "on_mqtt_message"):
                custom_handlers["on_mqtt_message"] = module.on_mqtt_message
            if hasattr(module, "on_startup"):
                module.on_startup()

            print(f"Loaded script: {script_path.name}")
        except Exception as e:
            print(f"Error loading {script_path}: {e}")


def on_mqtt_connect(client, userdata, flags, rc, properties=None):
    print(f"Connected to MQTT broker (rc={rc})")
    client.subscribe(f"swarm/{SWARM_ID}/#")
    print(f"Subscribed to swarm/{SWARM_ID}/#")


def on_mqtt_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        topic_parts = msg.topic.split("/")

        # swarm/{swarm_id}/nodes/{node_id}/telemetry
        if len(topic_parts) >= 5 and topic_parts[4] == "telemetry":
            node_id = topic_parts[3]
            handle_telemetry(node_id, payload)
        elif len(topic_parts) >= 4 and "telemetry" in topic_parts:
            # Flexible matching
            node_id = topic_parts[3] if len(topic_parts) > 3 else "unknown"
            handle_telemetry(node_id, payload)

        # Custom handler
        if "on_mqtt_message" in custom_handlers:
            custom_handlers["on_mqtt_message"](msg.topic, payload)

    except json.JSONDecodeError:
        print(f"Invalid JSON on {msg.topic}: {msg.payload}")
    except Exception as e:
        print(f"MQTT message error: {e}")


def handle_telemetry(node_id: str, data: dict):
    """Process incoming telemetry."""
    timestamp = data.get("timestamp", int(datetime.now().timestamp() * 1000))
    readings = data.get("readings", data)

    entry = {
        "timestamp": timestamp,
        "readings": readings,
        "received_at": datetime.now().isoformat(),
    }

    if node_id not in telemetry_store:
        telemetry_store[node_id] = []
    telemetry_store[node_id].append(entry)

    # Keep last 1000 entries per node
    if len(telemetry_store[node_id]) > 1000:
        telemetry_store[node_id] = telemetry_store[node_id][-1000:]

    # Update node status
    node_status[node_id] = {
        "last_seen": datetime.now().isoformat(),
        "latest_readings": readings,
    }

    # Custom handler
    if "on_telemetry" in custom_handlers:
        try:
            custom_handlers["on_telemetry"](node_id, readings, timestamp)
        except Exception as e:
            print(f"Custom handler error: {e}")

    print(f"[{node_id}] {readings}")


# HTTP endpoints
@app.get("/")
def root():
    return {
        "swarm_id": SWARM_ID,
        "nodes": list(node_status.keys()),
        "total_telemetry": sum(len(v) for v in telemetry_store.values()),
        "alerts": len(alerts),
    }


@app.post("/api/telemetry/{node_id}")
def post_telemetry(node_id: str, payload: TelemetryPayload):
    handle_telemetry(node_id, payload.model_dump())
    return {"status": "ok"}


@app.get("/api/nodes")
def get_nodes():
    return node_status


@app.get("/api/nodes/{node_id}")
def get_node(node_id: str):
    if node_id not in node_status:
        raise HTTPException(404, "Node not found")
    return {
        "status": node_status[node_id],
        "telemetry": telemetry_store.get(node_id, [])[-100:],
    }


@app.get("/api/telemetry")
def get_all_telemetry(limit: int = 100):
    result = {}
    for node_id, entries in telemetry_store.items():
        result[node_id] = entries[-limit:]
    return result


@app.get("/api/alerts")
def get_alerts():
    return alerts[-100:]


@app.delete("/api/alerts")
def clear_alerts():
    alerts.clear()
    return {"status": "cleared"}


@app.post("/api/command/{node_id}")
def send_command(node_id: str, command: dict):
    topic = f"swarm/{SWARM_ID}/nodes/{node_id}/command"
    if mqtt_client and mqtt_client.is_connected():
        mqtt_client.publish(topic, json.dumps(command))
        return {"status": "sent", "topic": topic}
    return {"status": "mqtt_not_connected"}


@app.post("/api/reload-scripts")
def reload_scripts():
    load_custom_scripts()
    return {"status": "ok", "handlers": list(custom_handlers.keys())}


@app.get("/health")
def health():
    return {"status": "healthy", "mqtt_connected": mqtt_client.is_connected() if mqtt_client else False}


def start_mqtt():
    global mqtt_client
    mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    mqtt_client.on_connect = on_mqtt_connect
    mqtt_client.on_message = on_mqtt_message

    try:
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT)
        mqtt_client.loop_forever()
    except Exception as e:
        print(f"MQTT connection failed: {e}")
        print("Running in HTTP-only mode")


if __name__ == "__main__":
    print(f"Starting Swarm Aggregation Server")
    print(f"  Swarm ID: {SWARM_ID}")
    print(f"  MQTT: {MQTT_BROKER}:{MQTT_PORT}")
    print(f"  HTTP: 0.0.0.0:{HTTP_PORT}")

    load_custom_scripts()

    # Start MQTT in background thread
    mqtt_thread = Thread(target=start_mqtt, daemon=True)
    mqtt_thread.start()

    # Start HTTP server
    uvicorn.run(app, host="0.0.0.0", port=HTTP_PORT)
