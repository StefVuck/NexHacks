# Woodwide AI - CSV Statistics Integration

Complete guide for using CSV-based statistics reporting in the NexHacks microcontroller firmware generation system.

## Overview

Woodwide AI integration enables automatic CSV data export from microcontrollers for telemetry, statistics, and sensor data logging. The system intelligently detects CSV requirements from natural language descriptions and generates appropriate firmware code.

## Quick Start

### Simple Serial CSV Example

```python
from agent import SystemSpec, NodeSpec, TestAssertion

spec = SystemSpec(
    description="Temperature monitoring with CSV logging",
    board_id="lm3s6965",
    nodes=[
        NodeSpec(
            node_id="temp_sensor",
            description="Read temperature every second and export to CSV via serial",
            assertions=[
                TestAssertion(name="csv_header", pattern="timestamp,node_id"),
                TestAssertion(name="has_data", pattern="temp_sensor"),
            ],
        ),
    ],
)
```

The system will automatically:
1. Detect "CSV" keyword in the description
2. Generate CSV buffer management code
3. Create timestamp tracking
4. Format output as proper CSV
5. Print to serial/semihosting

## CSV Export Methods

### 1. Serial Output (UART)

**Supported Boards:** All (STM32, ESP32, Arduino, LM3S)

**Use Cases:**
- Real-time monitoring during development
- Debugging sensor readings
- Quick data collection via serial terminal

**Example:**
```python
NodeSpec(
    node_id="sensor_1",
    description="Temperature sensor with CSV logging to serial every 30 seconds",
    assertions=[
        TestAssertion(name="csv", pattern="timestamp,node_id,temperature"),
    ],
)
```

**Output:**
```
timestamp,node_id,temperature
1000,sensor_1,25.3
31000,sensor_1,25.4
61000,sensor_1,25.5
```

**Accessing Data:**
```bash
# Via serial terminal
screen /dev/ttyUSB0 115200

# Or save to file
cat /dev/ttyUSB0 > sensor_data.csv
```

### 2. SD Card Storage

**Supported Boards:** ESP32, Arduino

**Use Cases:**
- Long-term data logging
- Offline data collection
- Field deployments without network

**Hardware Required:**
- SD card module (SPI interface)
- Typical wiring:
  - CS: Pin 5
  - MOSI: Pin 23
  - MISO: Pin 19
  - SCK: Pin 18

**Example:**
```python
from agent.esp32_orchestrator import ESP32SystemSpec, ESP32NodeSpec

spec = ESP32SystemSpec(
    description="Weather station with SD card logging",
    board_id="esp32",
    nodes=[
        ESP32NodeSpec(
            node_id="weather_1",
            description="Log temperature, humidity, pressure to SD card CSV every 5 minutes",
            features=["sd"],
            assertions=[
                TestAssertion(name="sd_init", pattern="SD card"),
                TestAssertion(name="writing", pattern="data.csv"),
            ],
        ),
    ],
)
```

**Generated Code Includes:**
- SD card initialization
- CSV file creation with headers
- Append-mode writing
- Error handling for SD failures

**Retrieving Data:**
1. Power off device
2. Remove SD card
3. Insert into computer
4. Open `/data.csv`

### 3. HTTP Endpoint

**Supported Boards:** ESP32 only (requires WiFi)

**Use Cases:**
- Remote data access
- Web-based dashboards
- API integration
- Real-time monitoring over network

**Example:**
```python
spec = ESP32SystemSpec(
    description="IoT sensor with HTTP CSV endpoint",
    board_id="esp32",
    mqtt_broker="broker.hivemq.com",
    nodes=[
        ESP32NodeSpec(
            node_id="iot_sensor",
            description="Serve CSV statistics at /data.csv endpoint with last 100 readings",
            features=["wifi", "http"],
            assertions=[
                TestAssertion(name="wifi", pattern="connected!"),
                TestAssertion(name="server", pattern="CSV server started"),
            ],
        ),
    ],
)
```

**Accessing Data:**
```bash
# Get device IP from serial output
# CSV server started at http://192.168.1.100/data.csv

# Download CSV
curl http://192.168.1.100/data.csv -o sensor_data.csv

# View in browser
open http://192.168.1.100/data.csv
```

**Response Format:**
```csv
timestamp,node_id,temperature,humidity,pressure
1705500000,iot_sensor,25.3,60.2,1013.25
1705500060,iot_sensor,25.4,60.1,1013.20
1705500120,iot_sensor,25.5,60.0,1013.15
```

## CSV Format Specification

### Standard Format

```csv
timestamp,node_id,field1,field2,field3,...
```

### Field Descriptions

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `timestamp` | unsigned long | Milliseconds since boot or Unix timestamp | `1705500000` |
| `node_id` | string | Unique node identifier | `sensor_1` |
| Custom fields | float/int | Sensor readings, system stats | `25.3`, `60.2` |

### Example Formats

**Temperature Sensor:**
```csv
timestamp,node_id,temperature
1000,temp_1,25.3
2000,temp_1,25.4
```

**Weather Station:**
```csv
timestamp,node_id,temperature,humidity,pressure,battery
1000,weather_1,25.3,60.2,1013.25,3.7
2000,weather_1,25.4,60.1,1013.20,3.7
```

**System Monitoring:**
```csv
timestamp,node_id,uptime,free_memory,error_count
1000,system_1,1000,45000,0
2000,system_1,2000,44800,0
```

## Automatic Detection

The firmware generator automatically detects CSV requirements when your description contains these keywords:

- `csv` or `CSV`
- `statistics`
- `data export`
- `logging`
- `log data`
- `export data`

### Detection Examples

✅ **Will trigger CSV generation:**
- "Temperature sensor with **CSV logging**"
- "Export **statistics** to file"
- "**Log data** every minute"
- "**Data export** via serial"

❌ **Will NOT trigger CSV generation:**
- "Temperature sensor"
- "Print readings to serial"
- "Monitor temperature"

## API Configuration

### CSVConfig Model

```python
from api.models import CSVConfig, NodePlacement

csv_config = CSVConfig(
    enabled=True,
    method="serial",  # "serial" | "sd" | "http"
    interval_seconds=60,
    fields=["timestamp", "node_id", "temperature", "humidity"],
    max_rows=1000,
)

node = NodePlacement(
    node_id="sensor_1",
    description="Temperature sensor with CSV export",
    board_id="esp32",
    csv_config=csv_config,
)
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | bool | `False` | Enable CSV export |
| `method` | str | `"serial"` | Export method: `"serial"`, `"sd"`, or `"http"` |
| `interval_seconds` | int | `60` | Logging interval in seconds |
| `fields` | list[str] | `["timestamp", "node_id"]` | CSV column names |
| `max_rows` | int | `1000` | Maximum rows in circular buffer |

## Memory Management

### Buffer Sizes

The CSV implementation uses circular buffers to handle memory constraints:

| Board | Typical RAM | Recommended max_rows |
|-------|-------------|---------------------|
| STM32F103 | 20KB | 50-100 |
| LM3S6965 | 64KB | 100-200 |
| ESP32 | 520KB | 500-1000 |
| Arduino Due | 96KB | 100-300 |

### Memory Calculation

Each CSV row consumes approximately:
- Timestamp: 4 bytes
- Node ID: 16 bytes
- Values: 8 floats × 4 bytes = 32 bytes
- **Total: ~52 bytes per row**

For 100 rows: ~5.2KB
For 1000 rows: ~52KB

## Code Templates

### Serial CSV Template

Automatically included when CSV is detected on any board:

```c
typedef struct {
    unsigned long timestamp;
    char node_id[16];
    float values[8];
    int value_count;
} CSVRow;

CSVRow csv_buffer[CSV_MAX_ROWS];
int csv_row_count = 0;
int csv_write_index = 0;

void csv_add_row(const char* node_id, float* values, int count);
void csv_print_header(const char** field_names, int field_count);
void csv_print_all();
```

### HTTP CSV Template (ESP32)

Automatically included for ESP32 with HTTP:

```c
#include <WebServer.h>

WebServer csv_server(80);

void csv_handle_request() {
    String csv = "timestamp,node_id,temperature,humidity\n";
    // ... build CSV from buffer
    csv_server.send(200, "text/csv", csv);
}

void csv_server_setup() {
    csv_server.on("/data.csv", csv_handle_request);
    csv_server.begin();
}
```

### SD Card CSV Template

Automatically included for ESP32/Arduino with SD:

```c
#include <SD.h>
#include <SPI.h>

bool csv_sd_init();
void csv_sd_write_row(const char* node_id, float* values, int count);
```

## Integration with Existing Features

### With MQTT

```python
ESP32NodeSpec(
    node_id="iot_sensor",
    description="Publish to MQTT and export CSV statistics via HTTP",
    features=["wifi", "mqtt", "http"],
    mqtt_topics=["sensors/temperature"],
)
```

### With DHT Sensor

```python
ESP32NodeSpec(
    node_id="weather_station",
    description="DHT22 sensor logging temperature and humidity to CSV every minute",
    features=["dht"],
)
```

## Testing

### Test CSV Generation

```python
import asyncio
from agent import GenerationLoop, SystemSpec, NodeSpec, TestAssertion

spec = SystemSpec(
    description="CSV test",
    board_id="lm3s6965",
    nodes=[
        NodeSpec(
            node_id="test_csv",
            description="Generate CSV output with timestamp and counter",
            assertions=[
                TestAssertion(name="header", pattern="timestamp,node_id"),
                TestAssertion(name="data", pattern="test_csv"),
            ],
        ),
    ],
)

loop = GenerationLoop()
results = await loop.run(spec)
```

### Verify Output

Check simulation output for CSV format:
```
timestamp,node_id,counter
1000,test_csv,1
2000,test_csv,2
3000,test_csv,3
```

## Troubleshooting

### CSV Not Generated

**Problem:** Description doesn't trigger CSV detection

**Solution:** Include explicit CSV keywords:
```python
# Before
description="Temperature sensor that saves data"

# After
description="Temperature sensor with CSV logging"
```

### Memory Overflow

**Problem:** Device crashes or resets

**Solution:** Reduce `max_rows` in CSVConfig:
```python
csv_config = CSVConfig(
    max_rows=50,  # Reduced from 1000
)
```

### SD Card Not Detected

**Problem:** "SD card initialization failed!"

**Solution:**
1. Check wiring (CS, MOSI, MISO, SCK)
2. Verify SD card is formatted (FAT32)
3. Check power supply (SD cards need stable 3.3V)

### HTTP Server Not Accessible

**Problem:** Cannot access CSV endpoint

**Solution:**
1. Check WiFi connection: Look for "connected!" in serial output
2. Note the IP address from serial output
3. Ensure device and computer on same network
4. Try `ping <device-ip>` first

## Best Practices

### 1. Choose Appropriate Method

- **Development/Testing:** Use serial CSV
- **Field Deployment:** Use SD card CSV
- **Remote Monitoring:** Use HTTP CSV

### 2. Set Reasonable Intervals

```python
# Good - 1 minute intervals
description="Log temperature to CSV every minute"

# Avoid - Too frequent for most use cases
description="Log temperature to CSV every 100ms"
```

### 3. Limit Buffer Size

Match buffer size to available RAM:
```python
# STM32F103 (20KB RAM)
csv_config = CSVConfig(max_rows=50)

# ESP32 (520KB RAM)
csv_config = CSVConfig(max_rows=1000)
```

### 4. Include Meaningful Fields

```python
# Good - descriptive field names
fields=["timestamp", "node_id", "temp_celsius", "humidity_percent"]

# Avoid - generic names
fields=["timestamp", "node_id", "value1", "value2"]
```

## Examples Gallery

### Example 1: Multi-Sensor Logger

```python
spec = SystemSpec(
    description="Multi-sensor data logger with CSV export",
    board_id="lm3s6965",
    nodes=[
        NodeSpec(
            node_id="logger_1",
            description="Log temperature, humidity, and light level to CSV every 30 seconds",
            assertions=[
                TestAssertion(name="csv", pattern="timestamp,node_id,temperature,humidity,light"),
            ],
        ),
    ],
)
```

### Example 2: Battery Monitor

```python
spec = ESP32SystemSpec(
    description="Battery monitoring system",
    board_id="esp32",
    nodes=[
        ESP32NodeSpec(
            node_id="battery_monitor",
            description="Monitor battery voltage and current, export CSV via HTTP",
            features=["wifi", "http"],
            assertions=[
                TestAssertion(name="csv_server", pattern="CSV server started"),
            ],
        ),
    ],
)
```

### Example 3: Environmental Station

```python
spec = ESP32SystemSpec(
    description="Environmental monitoring station",
    board_id="esp32",
    nodes=[
        ESP32NodeSpec(
            node_id="env_station",
            description="DHT22 sensor logging to SD card CSV every 5 minutes with temperature, humidity, and timestamp",
            features=["dht", "sd"],
            assertions=[
                TestAssertion(name="sd", pattern="SD card"),
                TestAssertion(name="dht", pattern="DHT"),
            ],
        ),
    ],
)
```

## Future Enhancements

- [ ] Custom CSV delimiters (semicolon, tab)
- [ ] Compression for large CSV files
- [ ] Real-time streaming over WebSocket
- [ ] CSV to JSON conversion
- [ ] Automatic cloud upload (AWS S3, Google Cloud Storage)
- [ ] Data visualization endpoints

## Support

For issues or questions about Woodwide AI CSV integration:
1. Check this documentation
2. Review examples in `INTEGRATION.md`
3. Test with simple serial CSV first
4. Verify board compatibility

## References

- Main Integration Guide: `INTEGRATION.md`
- API Models: `api/models.py`
- CSV Templates: `agent/templates.py`
- Orchestrator: `agent/orchestrator.py`
