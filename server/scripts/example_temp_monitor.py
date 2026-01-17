"""Example: Temperature monitoring with alerts.

This is an example of what the LLM would generate based on a user prompt like:
"5 temperature sensors, alert if any > 40C, calculate average"

Available globals (injected by main server):
    telemetry_store: dict[node_id, list[entries]]
    node_status: dict[node_id, status]
    alerts: list[alert_dicts]
    mqtt_client: paho MQTT client
    SWARM_ID: str

Define any of these functions to handle events:
    on_telemetry(node_id, readings, timestamp) - Called for each telemetry message
    on_mqtt_message(topic, payload) - Called for all MQTT messages
    on_startup() - Called when script is loaded
"""

TEMP_THRESHOLD = 40.0


def on_startup():
    """Called when the script is loaded."""
    print("Temperature monitor loaded, threshold: {TEMP_THRESHOLD}C")


def on_telemetry(node_id: str, readings: dict, timestamp: int):
    """Process telemetry and check for alerts."""
    temp = readings.get("temp") or readings.get("temperature")

    if temp is None:
        return

    # Check threshold
    if temp > TEMP_THRESHOLD:
        alert = {
            "type": "high_temperature",
            "node_id": node_id,
            "value": temp,
            "threshold": TEMP_THRESHOLD,
            "timestamp": timestamp,
        }
        alerts.append(alert)
        print(f"ALERT: {node_id} temperature {temp}C exceeds {TEMP_THRESHOLD}C")

        # Optionally send command back to node
        if mqtt_client and mqtt_client.is_connected():
            import json
            cmd_topic = f"swarm/{SWARM_ID}/nodes/{node_id}/command"
            mqtt_client.publish(cmd_topic, json.dumps({"action": "alarm", "reason": "high_temp"}))

    # Calculate average across all nodes
    all_temps = []
    for nid, status in node_status.items():
        latest = status.get("latest_readings", {})
        t = latest.get("temp") or latest.get("temperature")
        if t is not None:
            all_temps.append(t)

    if all_temps:
        avg = sum(all_temps) / len(all_temps)
        print(f"Average temperature across {len(all_temps)} nodes: {avg:.1f}C")
