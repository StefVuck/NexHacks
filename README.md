# NexHacks

AI-powered microcontroller firmware generation and simulation platform with integrated CSV statistics export (Woodwide AI).

## Features

- 🤖 **AI-Driven Firmware Generation** - Natural language to embedded C code using Claude
- 🔄 **Automated Build & Test Loop** - Generate → Compile → Simulate → Iterate
- 📊 **CSV Statistics Export** - Automatic data logging via serial, SD card, or HTTP (Woodwide AI)
- 🎮 **Multi-Board Support** - STM32, ESP32, Arduino, LM3S6965
- 🖥️ **QEMU Simulation** - Test firmware without hardware
- 🌐 **ESP32 WiFi/MQTT** - Full network stack simulation via Wokwi
- ☁️ **Cloud Deployment** - Terraform-based AWS infrastructure provisioning
- 🔌 **Hardware Flashing** - Direct firmware deployment to real devices

## Quick Start

```bash
# Setup
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Required tools
brew install qemu arm-none-eabi-gcc

# Set API key
export ANTHROPIC_API_KEY=sk-ant-...

# Run test
python scripts/test_loop.py
```

## CSV Statistics Export (Woodwide AI)

Automatically export sensor data and telemetry as CSV files:

```python
from agent import SystemSpec, NodeSpec, TestAssertion

spec = SystemSpec(
    description="Temperature sensor with CSV logging",
    board_id="lm3s6965",
    nodes=[
        NodeSpec(
            node_id="sensor_1",
            description="Read temperature every minute and log to CSV via serial",
            assertions=[
                TestAssertion(name="csv", pattern="timestamp,node_id"),
            ],
        ),
    ],
)
```

**Output:**
```csv
timestamp,node_id,temperature
1000,sensor_1,25.3
2000,sensor_1,25.4
3000,sensor_1,25.5
```

### Export Methods

- **Serial (UART)** - All boards, real-time monitoring
- **SD Card** - ESP32/Arduino, offline logging
- **HTTP Endpoint** - ESP32 only, remote access via `http://device-ip/data.csv`

See [WOODWIDE_INTEGRATION.md](WOODWIDE_INTEGRATION.md) for complete documentation.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        DESIGN STAGE                          │
│  Natural Language → SystemSpec → Node Placements            │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                        BUILD STAGE                           │
│  Claude → C Code → arm-gcc → ELF Binary                     │
│  (with CSV templates if detected)                           │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                      SIMULATE STAGE                          │
│  QEMU/Wokwi → Test Assertions → Iterate if Failed          │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                       DEPLOY STAGE                           │
│  Terraform (AWS) → Flash Hardware → Live Monitoring         │
└─────────────────────────────────────────────────────────────┘
```

## Supported Boards

| Board | Flash | RAM | QEMU | WiFi | CSV Methods |
|-------|-------|-----|------|------|-------------|
| LM3S6965 Stellaris | 256KB | 64KB | ✅ | ❌ | Serial |
| STM32F103 Blue Pill | 64KB | 20KB | ✅ | ❌ | Serial |
| STM32F401 Nucleo | 512KB | 96KB | ✅ | ❌ | Serial |
| ESP32 | 4MB | 520KB | ⚠️ Wokwi | ✅ | Serial, SD, HTTP |
| Arduino Due | 512KB | 96KB | ✅ | ❌ | Serial, SD |

## Documentation

- **[INTEGRATION.md](INTEGRATION.md)** - Complete API reference and integration guide
- **[WOODWIDE_INTEGRATION.md](WOODWIDE_INTEGRATION.md)** - CSV statistics export documentation
- **[woodwide.md](woodwide.md)** - Implementation plan and technical details

## Project Structure

```
NexHacks/
├── api/                    # FastAPI backend
│   ├── models.py          # Pydantic models (includes CSVConfig)
│   └── routes/            # API endpoints
├── agent/                 # AI firmware generation
│   ├── orchestrator.py    # Main generation loop (CSV detection)
│   ├── templates.py       # Code templates (CSV templates)
│   └── boards.py          # Board configurations
├── simulator/             # QEMU/Wokwi orchestration
├── client/                # React frontend
├── scripts/               # Test and utility scripts
│   └── test_csv_integration.py  # CSV integration tests
└── docs/                  # Documentation

```

## Testing

### Run CSV Integration Tests

```bash
source .venv/bin/activate
python scripts/test_csv_integration.py
```

### Test Full Build Loop

```bash
export ANTHROPIC_API_KEY=sk-ant-...
python scripts/test_loop.py
```

### Test CSV Generation

```python
import asyncio
from agent import GenerationLoop, SystemSpec, NodeSpec, TestAssertion

spec = SystemSpec(
    description="CSV test",
    board_id="lm3s6965",
    nodes=[
        NodeSpec(
            node_id="csv_sensor",
            description="Temperature sensor with CSV logging every second",
            assertions=[
                TestAssertion(name="csv_header", pattern="timestamp,node_id"),
            ],
        ),
    ],
)

loop = GenerationLoop()
results = await loop.run(spec)
loop.cleanup()
```

## API Endpoints

### Build Stage
- `POST /api/build/start` - Start firmware generation
- `GET /api/build/status` - Get build progress
- `WS /ws/{session_id}` - Real-time build updates

### Simulate Stage
- `POST /api/simulate/start` - Start simulation
- `GET /api/simulate/status` - Get simulation state
- `POST /api/simulate/pause` - Pause simulation

### Deploy Stage
- `POST /api/deploy/cloud` - Provision AWS infrastructure
- `GET /api/deploy/devices` - List connected USB devices
- `POST /api/deploy/flash` - Flash firmware to device

## CSV Configuration API

```typescript
interface CSVConfig {
  enabled: boolean;
  method: "serial" | "sd" | "http";
  interval_seconds: number;
  fields: string[];
  max_rows: number;
}

interface NodePlacement {
  node_id: string;
  description: string;
  board_id: string;
  csv_config?: CSVConfig;
}
```

## Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional - AWS Deployment
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Optional - ESP32 Simulation
WOKWI_CLI_TOKEN=...
```

## Examples

### Example 1: Simple Temperature Sensor
```python
NodeSpec(
    node_id="temp_1",
    description="Read temperature every second, print to serial",
)
```

### Example 2: CSV Data Logger
```python
NodeSpec(
    node_id="logger_1",
    description="Log temperature and humidity to CSV every minute",
)
```

### Example 3: ESP32 HTTP CSV Server
```python
ESP32NodeSpec(
    node_id="http_sensor",
    description="Serve CSV data at /data.csv endpoint with WiFi",
    features=["wifi", "http"],
)
```

### Example 4: SD Card Weather Station
```python
ESP32NodeSpec(
    node_id="weather_station",
    description="DHT22 sensor logging to SD card CSV every 5 minutes",
    features=["dht", "sd"],
)
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `python scripts/test_csv_integration.py`
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For questions or issues:
- Check [INTEGRATION.md](INTEGRATION.md) for API documentation
- Review [WOODWIDE_INTEGRATION.md](WOODWIDE_INTEGRATION.md) for CSV features
- Open an issue on GitHub

## Acknowledgments

- **Woodwide AI** - CSV statistics integration
- **Anthropic Claude** - AI firmware generation
- **QEMU** - ARM emulation
- **Wokwi** - ESP32 simulation
- **PlatformIO** - ESP32 toolchain
