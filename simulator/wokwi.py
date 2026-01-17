"""Wokwi-based simulation for ESP32 and Arduino boards."""

from __future__ import annotations

import asyncio
import json
import os
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Callable

if TYPE_CHECKING:
    from agent.boards import BoardConfig

WOKWI_TOKEN = os.getenv("WOKWI_CLI_TOKEN")


@dataclass
class WokwiCircuit:
    """Defines a Wokwi circuit diagram."""
    parts: list[dict] = field(default_factory=list)
    connections: list[list] = field(default_factory=list)

    def add_esp32(self, part_id: str = "esp") -> "WokwiCircuit":
        self.parts.append({
            "type": "board-esp32-devkit-c-v4",
            "id": part_id,
            "top": 0,
            "left": 0,
            "attrs": {}
        })
        return self

    def add_esp32_s3(self, part_id: str = "esp") -> "WokwiCircuit":
        self.parts.append({
            "type": "board-esp32-s3-devkitc-1",
            "id": part_id,
            "top": 0,
            "left": 0,
            "attrs": {}
        })
        return self

    def add_dht22(self, part_id: str = "dht", data_pin: str = "esp:4") -> "WokwiCircuit":
        self.parts.append({
            "type": "wokwi-dht22",
            "id": part_id,
            "top": 100,
            "left": 0,
            "attrs": {}
        })
        self.connections.extend([
            [f"{part_id}:VCC", "esp:3V3"],
            [f"{part_id}:GND", "esp:GND.1"],
            [f"{part_id}:SDA", data_pin],
        ])
        return self

    def add_led(self, part_id: str, pin: str, color: str = "red") -> "WokwiCircuit":
        self.parts.append({
            "type": "wokwi-led",
            "id": part_id,
            "top": 50,
            "left": 100,
            "attrs": {"color": color}
        })
        self.connections.extend([
            [f"{part_id}:A", pin],
            [f"{part_id}:C", "esp:GND.2"],
        ])
        return self

    def to_json(self) -> str:
        return json.dumps({
            "version": 1,
            "author": "swarm-architect",
            "editor": "wokwi",
            "parts": self.parts,
            "connections": self.connections,
        }, indent=2)


@dataclass
class WokwiResult:
    success: bool
    serial_output: str = ""
    error: str | None = None
    timeout: bool = False


# ESP32 Arduino template with WiFi support
ESP32_TEMPLATE = '''
#include <WiFi.h>
#include <HTTPClient.h>

// WiFi credentials (will be replaced by generated code)
const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

// Server endpoint (will be replaced)
const char* SERVER_URL = "http://example.com/api/telemetry";

void setup_wifi() {
    Serial.print("Connecting to WiFi");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println(" connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
}

void send_to_server(const char* endpoint, const char* payload) {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        http.begin(endpoint);
        http.addHeader("Content-Type", "application/json");
        int code = http.POST(payload);
        if (code > 0) {
            Serial.printf("HTTP %d: %s\\n", code, http.getString().c_str());
        } else {
            Serial.printf("HTTP error: %s\\n", http.errorToString(code).c_str());
        }
        http.end();
    }
}

// GENERATED CODE BELOW
'''

ESP32_MQTT_TEMPLATE = '''
#include <WiFi.h>
#include <PubSubClient.h>

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";
const char* MQTT_BROKER = "broker.hivemq.com";
const int MQTT_PORT = 1883;
const char* MQTT_CLIENT_ID = "esp32_node";

WiFiClient espClient;
PubSubClient mqtt(espClient);

void setup_wifi() {
    Serial.print("Connecting to WiFi");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println(" connected!");
}

void mqtt_callback(char* topic, byte* payload, unsigned int length) {
    Serial.printf("Message on %s: ", topic);
    for (int i = 0; i < length; i++) {
        Serial.print((char)payload[i]);
    }
    Serial.println();
}

void setup_mqtt() {
    mqtt.setServer(MQTT_BROKER, MQTT_PORT);
    mqtt.setCallback(mqtt_callback);
    while (!mqtt.connected()) {
        Serial.print("Connecting to MQTT...");
        if (mqtt.connect(MQTT_CLIENT_ID)) {
            Serial.println(" connected!");
        } else {
            Serial.printf(" failed (rc=%d), retry in 5s\\n", mqtt.state());
            delay(5000);
        }
    }
}

void mqtt_publish(const char* topic, const char* payload) {
    mqtt.publish(topic, payload);
}

void mqtt_subscribe(const char* topic) {
    mqtt.subscribe(topic);
}

void mqtt_loop() {
    if (!mqtt.connected()) {
        setup_mqtt();
    }
    mqtt.loop();
}

// GENERATED CODE BELOW
'''


class WokwiOrchestrator:
    """Manages Wokwi simulation for ESP32/Arduino boards."""

    def __init__(self, token: str | None = WOKWI_TOKEN):
        self.token = token
        self._client = None

    async def _get_client(self):
        if not self.token:
            raise RuntimeError(
                "WOKWI_CLI_TOKEN not set. Get one from https://wokwi.com/dashboard/ci"
            )

        if self._client is None:
            from wokwi_client import WokwiClient
            self._client = WokwiClient(token=self.token)
            await self._client.connect()

        return self._client

    async def run_esp32(
        self,
        firmware_path: Path,
        circuit: WokwiCircuit | None = None,
        timeout_seconds: float = 30.0,
        on_serial: Callable[[str], None] | None = None,
    ) -> WokwiResult:
        """Run ESP32 firmware in Wokwi simulator."""
        try:
            client = await self._get_client()

            # Create default circuit if not provided
            if circuit is None:
                circuit = WokwiCircuit().add_esp32()

            # Write circuit to temp file
            with tempfile.NamedTemporaryFile(
                mode='w', suffix='.json', delete=False
            ) as f:
                f.write(circuit.to_json())
                diagram_path = f.name

            # Upload files
            await client.upload_file(diagram_path)
            await client.upload_file(str(firmware_path))

            # Start simulation
            await client.start_simulation(firmware=firmware_path.name)

            # Collect serial output
            serial_output = []
            try:
                async for line in asyncio.wait_for(
                    client.serial_monitor_cat(),
                    timeout=timeout_seconds
                ):
                    serial_output.append(line)
                    if on_serial:
                        on_serial(line)
            except asyncio.TimeoutError:
                pass

            await client.pause_simulation()

            return WokwiResult(
                success=True,
                serial_output="\n".join(serial_output),
                timeout=True,
            )

        except Exception as e:
            return WokwiResult(
                success=False,
                error=str(e),
            )

    async def run_multi_node(
        self,
        nodes: list[tuple[str, Path, WokwiCircuit]],  # (node_id, firmware, circuit)
        timeout_seconds: float = 60.0,
    ) -> dict[str, WokwiResult]:
        """Run multiple ESP32 nodes concurrently."""
        # Note: This requires multiple Wokwi connections or sequential runs
        # For true multi-node simulation, we'd need Wokwi's team features
        results = {}
        for node_id, firmware, circuit in nodes:
            results[node_id] = await self.run_esp32(
                firmware, circuit, timeout_seconds / len(nodes)
            )
        return results

    async def disconnect(self):
        if self._client:
            await self._client.disconnect()
            self._client = None


def get_esp32_template(with_mqtt: bool = False) -> str:
    """Get ESP32 Arduino template code."""
    return ESP32_MQTT_TEMPLATE if with_mqtt else ESP32_TEMPLATE


def generate_esp32_circuit(
    sensors: list[str] | None = None,
    leds: list[str] | None = None,
) -> WokwiCircuit:
    """Generate a Wokwi circuit with common components."""
    circuit = WokwiCircuit().add_esp32()

    if sensors:
        for i, sensor in enumerate(sensors):
            if sensor == "dht22":
                circuit.add_dht22(f"dht{i}", f"esp:{4 + i}")
            # Add more sensor types as needed

    if leds:
        for i, color in enumerate(leds):
            circuit.add_led(f"led{i}", f"esp:{12 + i}", color)

    return circuit
