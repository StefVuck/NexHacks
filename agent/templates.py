"""Board-specific code templates for firmware generation.

Templates use {{PLACEHOLDER}} syntax for values injected at flash time:
- {{WIFI_SSID}} - WiFi network name
- {{WIFI_PASSWORD}} - WiFi password
- {{SERVER_URL}} - Aggregation server HTTP endpoint
- {{MQTT_BROKER}} - MQTT broker hostname/IP
- {{MQTT_PORT}} - MQTT broker port
- {{NODE_ID}} - Unique node identifier
- {{SWARM_ID}} - Swarm/project identifier
"""

from dataclasses import dataclass, field


@dataclass
class DeployConfig:
    """Configuration injected into firmware at flash time."""
    wifi_ssid: str = "Wokwi-GUEST"
    wifi_password: str = ""
    server_url: str = "http://localhost:8080"
    mqtt_broker: str = "broker.hivemq.com"
    mqtt_port: int = 1883
    node_id: str = "node_1"
    swarm_id: str = "swarm_1"

    def as_dict(self) -> dict[str, str]:
        return {
            "WIFI_SSID": self.wifi_ssid,
            "WIFI_PASSWORD": self.wifi_password,
            "SERVER_URL": self.server_url,
            "MQTT_BROKER": self.mqtt_broker,
            "MQTT_PORT": str(self.mqtt_port),
            "NODE_ID": self.node_id,
            "SWARM_ID": self.swarm_id,
        }


def inject_config(template: str, config: DeployConfig) -> str:
    """Replace {{PLACEHOLDER}} tokens with actual values."""
    result = template
    for key, value in config.as_dict().items():
        result = result.replace("{{" + key + "}}", value)
    return result


# ESP32 with WiFi + HTTP
ESP32_HTTP_TEMPLATE = '''
#include <WiFi.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "{{WIFI_SSID}}";
const char* WIFI_PASSWORD = "{{WIFI_PASSWORD}}";
const char* SERVER_URL = "{{SERVER_URL}}";
const char* NODE_ID = "{{NODE_ID}}";
const char* SWARM_ID = "{{SWARM_ID}}";

void setup_wifi() {{
    Serial.print("Connecting to WiFi");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {{
        delay(500);
        Serial.print(".");
        attempts++;
    }}
    if (WiFi.status() == WL_CONNECTED) {{
        Serial.println(" connected!");
        Serial.print("IP: ");
        Serial.println(WiFi.localIP());
    }} else {{
        Serial.println(" failed!");
    }}
}}

void post_telemetry(const char* json_payload) {{
    if (WiFi.status() == WL_CONNECTED) {{
        HTTPClient http;
        char url[128];
        snprintf(url, 128, "%s/api/telemetry/%s", SERVER_URL, NODE_ID);
        http.begin(url);
        http.addHeader("Content-Type", "application/json");
        http.addHeader("X-Swarm-ID", SWARM_ID);
        int code = http.POST(json_payload);
        Serial.printf("POST %s -> %d\\n", url, code);
        http.end();
    }}
}}

void http_post(const char* url, const char* json_payload) {{
    if (WiFi.status() == WL_CONNECTED) {{
        HTTPClient http;
        http.begin(url);
        http.addHeader("Content-Type", "application/json");
        int code = http.POST(json_payload);
        Serial.printf("HTTP %d\\n", code);
        http.end();
    }}
}}

String http_get(const char* url) {{
    if (WiFi.status() == WL_CONNECTED) {{
        HTTPClient http;
        http.begin(url);
        int code = http.GET();
        if (code > 0) {{
            return http.getString();
        }}
        http.end();
    }}
    return "";
}}
'''

# ESP32 with MQTT
ESP32_MQTT_TEMPLATE = '''
#include <WiFi.h>
#include <PubSubClient.h>

const char* WIFI_SSID = "{{WIFI_SSID}}";
const char* WIFI_PASSWORD = "{{WIFI_PASSWORD}}";
const char* MQTT_BROKER = "{{MQTT_BROKER}}";
const int MQTT_PORT = {{MQTT_PORT}};
const char* NODE_ID = "{{NODE_ID}}";
const char* SWARM_ID = "{{SWARM_ID}}";
char MQTT_CLIENT_ID[32];
char TELEMETRY_TOPIC[64];
char COMMAND_TOPIC[64];

WiFiClient espClient;
PubSubClient mqtt(espClient);

void mqtt_callback(char* topic, byte* payload, unsigned int length);

void setup_wifi() {{
    Serial.print("Connecting to WiFi");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {{
        delay(500);
        Serial.print(".");
        attempts++;
    }}
    if (WiFi.status() == WL_CONNECTED) {{
        Serial.println(" connected!");
        // Generate unique client ID from MAC
        uint8_t mac[6];
        WiFi.macAddress(mac);
        snprintf(MQTT_CLIENT_ID, 32, "%s_%02x%02x%02x", NODE_ID, mac[3], mac[4], mac[5]);
        // Setup standard topics
        snprintf(TELEMETRY_TOPIC, 64, "swarm/%s/nodes/%s/telemetry", SWARM_ID, NODE_ID);
        snprintf(COMMAND_TOPIC, 64, "swarm/%s/nodes/%s/command", SWARM_ID, NODE_ID);
    }} else {{
        Serial.println(" failed!");
    }}
}}

void setup_mqtt() {{
    mqtt.setServer(MQTT_BROKER, MQTT_PORT);
    mqtt.setCallback(mqtt_callback);
}}

bool mqtt_connect() {{
    if (!mqtt.connected()) {{
        Serial.print("Connecting to MQTT...");
        if (mqtt.connect(MQTT_CLIENT_ID)) {{
            Serial.println(" connected!");
            // Auto-subscribe to command topic
            mqtt.subscribe(COMMAND_TOPIC);
            Serial.printf("Subscribed to %s\\n", COMMAND_TOPIC);
            return true;
        }} else {{
            Serial.printf(" failed (rc=%d)\\n", mqtt.state());
            return false;
        }}
    }}
    return true;
}}

void publish_telemetry(const char* json_payload) {{
    if (mqtt_connect()) {{
        mqtt.publish(TELEMETRY_TOPIC, json_payload);
        Serial.printf("Published to %s\\n", TELEMETRY_TOPIC);
    }}
}}

void mqtt_publish(const char* topic, const char* payload) {{
    if (mqtt_connect()) {{
        mqtt.publish(topic, payload);
        Serial.printf("Published to %s: %s\\n", topic, payload);
    }}
}}

void mqtt_subscribe(const char* topic) {{
    if (mqtt_connect()) {{
        mqtt.subscribe(topic);
        Serial.printf("Subscribed to %s\\n", topic);
    }}
}}

void mqtt_loop() {{
    mqtt_connect();
    mqtt.loop();
}}
'''

# ESP32 with DHT sensor
ESP32_DHT_TEMPLATE = '''
#include <DHT.h>

#define DHT_PIN 4
#define DHT_TYPE DHT22

DHT dht(DHT_PIN, DHT_TYPE);

void setup_dht() {{
    dht.begin();
}}

float read_temperature() {{
    float t = dht.readTemperature();
    if (isnan(t)) {{
        Serial.println("DHT read failed!");
        return -999.0;
    }}
    return t;
}}

float read_humidity() {{
    float h = dht.readHumidity();
    if (isnan(h)) {{
        Serial.println("DHT read failed!");
        return -999.0;
    }}
    return h;
}}
'''

# STM32 bare metal UART template
STM32_UART_TEMPLATE = '''
// STM32 UART helper using semihosting
// sh_write0 is provided by startup code

void print_int(int val) {{
    char buf[12];
    int_to_str(val, buf);
    sh_write0(buf);
}}

void print_line(const char* s) {{
    sh_write0(s);
    sh_write0("\\n");
}}

void print_keyval(const char* key, int val) {{
    sh_write0(key);
    sh_write0("=");
    print_int(val);
    sh_write0("\\n");
}}
'''

# Arduino template
ARDUINO_TEMPLATE = '''
void print_int(int val) {{
    Serial.print(val);
}}

void print_line(const char* s) {{
    Serial.println(s);
}}

void print_keyval(const char* key, int val) {{
    Serial.print(key);
    Serial.print("=");
    Serial.println(val);
}}
'''


def get_template_for_board(board_id: str, features: list[str] | None = None) -> str:
    """Get the appropriate template based on board and required features."""
    features = features or []

    if board_id.startswith("esp32"):
        if "mqtt" in features:
            return ESP32_MQTT_TEMPLATE
        elif "http" in features or "wifi" in features:
            return ESP32_HTTP_TEMPLATE
        elif "dht" in features or "temperature" in features:
            return ESP32_DHT_TEMPLATE
        else:
            return ESP32_HTTP_TEMPLATE  # Default to WiFi-capable

    elif board_id.startswith("arduino"):
        return ARDUINO_TEMPLATE

    elif board_id.startswith("stm32") or board_id == "lm3s6965":
        return STM32_UART_TEMPLATE

    return ""


def get_platformio_ini(board_id: str, features: list[str] | None = None) -> str:
    """Generate platformio.ini for ESP32/Arduino boards."""
    features = features or []

    if board_id == "esp32":
        libs = ["WiFi"]
        if "mqtt" in features:
            libs.append("PubSubClient")
        if "dht" in features:
            libs.append("DHT sensor library")

        return f'''[env:esp32]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200
lib_deps =
    {chr(10).join(f"    {lib}" for lib in libs)}
'''

    elif board_id == "esp32s3":
        return '''[env:esp32s3]
platform = espressif32
board = esp32-s3-devkitc-1
framework = arduino
monitor_speed = 115200
'''

    elif board_id == "arduino_uno":
        return '''[env:uno]
platform = atmelavr
board = uno
framework = arduino
'''

    return ""
