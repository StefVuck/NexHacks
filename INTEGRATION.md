# Integration Guide

API contract and capabilities for frontend integration with the simulation backend.

## Quick Start

```bash
# Setup
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Required tools
brew install qemu arm-none-eabi-gcc

# Run test
export ANTHROPIC_API_KEY=sk-ant-...
python scripts/test_loop.py
```

## Core Concepts

### SystemSpec
Describes what to build - nodes, target board, and test assertions.

```python
from agent import SystemSpec, NodeSpec, TestAssertion, BOARDS

spec = SystemSpec(
    description="Temperature monitoring system",
    board_id="stm32f103c8",  # See board table below
    nodes=[
        NodeSpec(
            node_id="sensor_1",
            description="Read temperature every second, print to UART",
            assertions=[
                TestAssertion(name="has_temp", pattern="temp="),
                TestAssertion(name="has_value", pattern="C"),
            ],
        ),
    ],
)
```

### GenerationLoop
Runs the generate -> compile -> simulate -> iterate cycle.

```python
from agent import GenerationLoop

loop = GenerationLoop()
results = await loop.run(spec, on_progress=callback)
```

### Callbacks

```python
def on_progress(node_id: str, iteration: int, status: str):
    # status: "running" | "success" | "failed"
    print(f"[{node_id}] Iteration {iteration}: {status}")
```

## Available Boards

| ID | Name | Flash | RAM | QEMU | Notes |
|----|------|-------|-----|------|-------|
| `lm3s6965` | LM3S6965 Stellaris | 256KB | 64KB | Yes | Best QEMU support, recommended for testing |
| `stm32f103c8` | STM32F103 Blue Pill | 64KB | 20KB | Yes | Tight constraints, good for optimization tests |
| `stm32f401re` | STM32F401 Nucleo | 512KB | 96KB | Yes | FPU available |
| `stm32f407vg` | STM32F407 Discovery | 1024KB | 192KB | Yes | High performance |
| `arduino_due` | Arduino Due | 512KB | 96KB | Yes | ARM-based Arduino |
| `esp32` | ESP32 | 4096KB | 520KB | No | WiFi/BT, no QEMU yet |
| `arduino_uno` | Arduino Uno | 32KB | 2KB | No | AVR, no QEMU yet |

## API Response Types

### IterationResult

```typescript
interface IterationResult {
  iteration: number;
  generated_code: string;
  compilation: {
    success: boolean;
    errors?: string;
    warnings?: string;
    memory?: {
      text: number;      // Code size in bytes
      data: number;      // Initialized data
      bss: number;       // Uninitialized data
      flash_usage: number;
      ram_usage: number;
    };
  };
  simulation?: {
    success: boolean;
    stdout: string;      // Program output (semihosting)
    timeout: boolean;    // True if simulation ran until timeout
    constraint_errors: string[];  // Memory limit violations
  };
  test_results: {
    passed: boolean;
    assertion: {
      name: string;
      pattern: string;
    };
    actual_output: string;
  }[];
  success: boolean;  // Overall: compiled + simulated + tests passed
}
```

### Full Run Response

```typescript
interface RunResponse {
  [node_id: string]: IterationResult[];
}
```

## WebSocket Events (Proposed)

For real-time updates during generation:

```typescript
// Client -> Server
{ type: "start", spec: SystemSpec }
{ type: "stop" }

// Server -> Client
{ type: "iteration_start", node_id: string, iteration: number }
{ type: "compile_result", node_id: string, success: boolean, errors?: string }
{ type: "simulation_output", node_id: string, output: string }
{ type: "test_result", node_id: string, assertion: string, passed: boolean }
{ type: "iteration_complete", node_id: string, success: boolean }
{ type: "complete", results: RunResponse }
{ type: "error", message: string }
```

## Board Templates

Each board has pre-configured:
- Memory limits (Flash/RAM)
- Compiler flags
- QEMU machine type
- Architecture-specific startup code

The backend provides these helpers to generated code:
- `sh_write0(const char*)` - Print string via semihosting
- `int_to_str(int, char*)` - Integer to string conversion

## Constraints Enforced

1. **No standard library** - Generated code cannot use stdio.h, stdlib.h, etc.
2. **Memory limits** - Code must fit in board's Flash/RAM
3. **No dynamic allocation** - No malloc/free
4. **No floating point** (on non-FPU boards) - Must use fixed-point math

## Error Handling

The loop automatically retries up to 3 times when:
- Compilation fails (syntax errors, missing symbols)
- Tests fail (expected patterns not in output)
- Memory constraints violated

Each retry includes the error context in the prompt to Claude.

## Example: Multi-Node System

```python
spec = SystemSpec(
    description="3 temperature sensors reporting to aggregator",
    board_id="lm3s6965",
    nodes=[
        NodeSpec(
            node_id="sensor_1",
            description="Temperature sensor, prints 'sensor1:XX' every 100ms",
            assertions=[TestAssertion(name="output", pattern="sensor1:")],
        ),
        NodeSpec(
            node_id="sensor_2",
            description="Temperature sensor, prints 'sensor2:XX' every 100ms",
            assertions=[TestAssertion(name="output", pattern="sensor2:")],
        ),
        NodeSpec(
            node_id="aggregator",
            description="Receives sensor data, prints average",
            assertions=[TestAssertion(name="avg", pattern="avg=")],
        ),
    ],
)
```

Note: Currently nodes run independently. Inter-node communication (CAN, UART bridge) is a stretch goal.

## ESP32 Simulation with Wokwi

For ESP32 boards, we use [Wokwi](https://wokwi.com) which provides:
- Full WiFi simulation (connects to real internet)
- MQTT support (connects to real brokers)
- Sensor simulation (DHT22, etc.)
- Visual circuit diagrams

### Setup

```bash
# Install PlatformIO
pip install platformio

# Get Wokwi token from https://wokwi.com/dashboard/ci
export WOKWI_CLI_TOKEN=your-token-here
```

### ESP32 API

```python
from agent.esp32_orchestrator import (
    ESP32GenerationLoop,
    ESP32NodeSpec,
    ESP32SystemSpec,
    TestAssertion,
)

spec = ESP32SystemSpec(
    description="IoT sensor network",
    board_id="esp32",
    mqtt_broker="broker.hivemq.com",
    nodes=[
        ESP32NodeSpec(
            node_id="sensor_1",
            description="Temperature sensor publishing to MQTT",
            features=["wifi", "mqtt", "dht"],
            mqtt_topics=["swarm/sensors/temp"],
            assertions=[
                TestAssertion(name="connected", pattern="connected!"),
                TestAssertion(name="publishing", pattern="Published"),
            ],
        ),
    ],
)

loop = ESP32GenerationLoop()
results = await loop.run(spec)
```

### Available Features

| Feature | Description | Template Provided |
|---------|-------------|-------------------|
| `wifi` | WiFi connection with `setup_wifi()` | Yes |
| `http` | HTTP client with `http_get()`, `http_post()` | Yes |
| `mqtt` | MQTT client with `mqtt_publish()`, `mqtt_subscribe()` | Yes |
| `dht` | DHT22 sensor with `read_temperature()`, `read_humidity()` | Yes |

### Circuit Generation

Circuits are auto-generated based on features:

```python
from simulator.wokwi import generate_esp32_circuit

# Creates ESP32 with DHT22 sensor and green LED
circuit = generate_esp32_circuit(
    sensors=["dht22"],
    leds=["green"],
)
```

### Multi-Node Architecture

For simulating a network of ESP32s communicating with a server:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  ESP32 #1   │     │  ESP32 #2   │     │  ESP32 #3   │
│  (Sensor)   │     │  (Sensor)   │     │  (Sensor)   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ MQTT publish      │ MQTT publish      │ MQTT publish
       ▼                   ▼                   ▼
┌──────────────────────────────────────────────────────┐
│                   MQTT Broker                        │
│              (broker.hivemq.com)                     │
└──────────────────────┬───────────────────────────────┘
                       │
                       │ MQTT subscribe
                       ▼
              ┌─────────────────┐
              │ Aggregation     │
              │ Server          │
              │ (Your backend)  │
              └─────────────────┘
```

Each ESP32 runs in its own Wokwi simulation but connects to real MQTT brokers, enabling actual inter-node communication.

## Simulation Modes Summary

| Board Type | Simulator | Networking | Peripherals |
|------------|-----------|------------|-------------|
| STM32/LM3S | QEMU | Semihosting only | Limited |
| ESP32 | Wokwi | Real WiFi/MQTT | Full (sensors, LEDs, etc.) |
| Arduino AVR | Not yet | N/A | N/A |

## Limitations

1. **Wokwi requires internet** - Simulations connect to Wokwi cloud
2. **PlatformIO required for ESP32** - Compilation uses PIO toolchain
3. **Sequential ESP32 sims** - Multi-node runs sequentially (parallel coming)
4. **AVR not yet supported** - Use ESP32 or STM32 for now

## Stage 4: Deployment

After simulation passes, deploy to real hardware and cloud infrastructure.

### Deployment Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DEPLOYMENT                                   │
│                                                                      │
│  1. Provision Cloud          2. Inject Config        3. Flash       │
│  ┌─────────────────┐        ┌─────────────────┐    ┌─────────────┐ │
│  │ terraform apply │   ->   │ Get server IP   │ -> │ esptool.py  │ │
│  │ - EC2 instance  │        │ Inject into     │    │ stm32flash  │ │
│  │ - MQTT broker   │        │ firmware        │    │             │ │
│  │ - Security group│        │                 │    │             │ │
│  └─────────────────┘        └─────────────────┘    └─────────────┘ │
│           │                                               │         │
│           ▼                                               ▼         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    LIVE SYSTEM                               │   │
│  │   Real ESP32s  ◄──── MQTT ────►  Cloud Server               │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Terraform Configuration

Frontend needs to collect these variables:

```typescript
interface TerraformConfig {
  swarm_id: string;           // Unique identifier, e.g., "warehouse-demo"
  aws_region?: string;        // Default: "us-east-1"
  instance_type?: string;     // Default: "t3.micro"
  auto_destroy_hours?: number; // Auto-terminate, default: 2 (0 to disable)
}
```

### WiFi Configuration

For firmware to connect to the cloud server:

```typescript
interface WifiConfig {
  ssid: string;               // WiFi network name
  password: string;           // WiFi password
}
```

### Deploy Config (Injected into Firmware)

```typescript
interface DeployConfig {
  wifi_ssid: string;
  wifi_password: string;
  server_url: string;         // From Terraform output
  mqtt_broker: string;        // From Terraform output
  mqtt_port: number;          // Default: 1883
  node_id: string;            // Unique per device
  swarm_id: string;
}
```

### Terraform Outputs

After `terraform apply`, these values are returned:

```typescript
interface TerraformOutputs {
  server_ip: string;          // "52.1.2.3"
  server_url: string;         // "http://52.1.2.3:8080"
  mqtt_broker: string;        // "52.1.2.3"
  mqtt_port: number;          // 1883
  mqtt_ws_url: string;        // "ws://52.1.2.3:9001" (for browser)
  ssh_command: string;        // "ssh ubuntu@52.1.2.3"
  instance_id: string;        // For manual termination
}
```

### USB Device Detection

```typescript
interface DetectedDevice {
  port: string;               // "/dev/ttyUSB0" or "COM3"
  board_type: string;         // "esp32" | "stm32" | "arduino_uno" | "unknown"
  chip_name: string;          // "Silicon Labs CP210x"
  vid: string;                // USB Vendor ID
  pid: string;                // USB Product ID
}
```

### Flash Progress

```typescript
interface FlashProgress {
  node_id: string;
  port: string;
  stage: "erasing" | "writing" | "verifying" | "complete" | "error";
  percent: number;            // 0-100
  error?: string;
}
```

### Deployment API Endpoints

```typescript
// Cloud Infrastructure
POST /api/deploy/cloud
  Body: TerraformConfig
  Response: { status: "provisioning", estimated_time: 120 }

GET /api/deploy/cloud/status
  Response: TerraformOutputs | { status: "provisioning" | "failed", error?: string }

DELETE /api/deploy/cloud
  Response: { status: "destroying" }

// Hardware Flashing
GET /api/deploy/devices
  Response: DetectedDevice[]

POST /api/deploy/flash
  Body: {
    node_id: string;
    port: string;
    firmware_path?: string;   // If pre-compiled, otherwise uses session build
    wifi_config: WifiConfig;
  }
  Response: { status: "flashing" }

GET /api/deploy/flash/status
  Response: { [node_id]: FlashProgress }
```

### WebSocket Events (Stage 4)

```typescript
// Cloud provisioning
← { stage: "deploy", type: "terraform_start" }
← { stage: "deploy", type: "terraform_progress", resource: "aws_instance.server", status: "creating" }
← { stage: "deploy", type: "terraform_complete", outputs: TerraformOutputs }
← { stage: "deploy", type: "terraform_error", error: string }

// Hardware flashing
← { stage: "deploy", type: "device_detected", device: DetectedDevice }
← { stage: "deploy", type: "device_disconnected", port: string }
← { stage: "deploy", type: "flash_start", node_id: string, port: string }
← { stage: "deploy", type: "flash_progress", node_id: string, percent: number }
← { stage: "deploy", type: "flash_complete", node_id: string }
← { stage: "deploy", type: "flash_error", node_id: string, error: string }

// Live system
← { stage: "deploy", type: "node_online", node_id: string, ip: string }
← { stage: "deploy", type: "server_received", node_id: string, data: object }
```

### Server API (Aggregation Server)

Once deployed, the cloud server exposes:

```typescript
// Base URL: http://{server_ip}:8080

GET /
  Response: { swarm_id, nodes: string[], total_telemetry: number, alerts: number }

GET /api/nodes
  Response: { [node_id]: { last_seen: string, latest_readings: object } }

GET /api/nodes/{node_id}
  Response: { status: object, telemetry: object[] }

GET /api/telemetry?limit=100
  Response: { [node_id]: object[] }

GET /api/alerts
  Response: object[]

POST /api/command/{node_id}
  Body: { action: string, ... }
  Response: { status: "sent", topic: string }

// For LLM-generated scripts
POST /api/reload-scripts
  Response: { status: "ok", handlers: string[] }
```

### MQTT Topics

Devices publish/subscribe to these topics:

```
swarm/{swarm_id}/nodes/{node_id}/telemetry   <- Device publishes readings
swarm/{swarm_id}/nodes/{node_id}/command     -> Device receives commands
```

Payload format:
```json
{
  "timestamp": 1705500000000,
  "readings": {
    "temp": 25.5,
    "humidity": 60
  }
}
```

### Environment Variables (Backend)

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional - Terraform
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Optional - Wokwi (for ESP32 simulation)
WOKWI_CLI_TOKEN=...
```

### Complete Frontend Flow

```typescript
// 1. Design
const spec = await api.post('/api/design/parse', { prompt: userInput });
// or manual device placement

// 2. Build
const ws = new WebSocket(`/ws/${sessionId}`);
await api.post('/api/build/start', { spec });
// Listen for build progress via WebSocket

// 3. Simulate
await api.post('/api/simulate/start', { session_id: sessionId });
// Watch simulation output via WebSocket

// 4. Deploy
// 4a. Provision cloud
await api.post('/api/deploy/cloud', {
  swarm_id: 'my-demo',
  auto_destroy_hours: 2
});
// Wait for terraform_complete event

// 4b. Get WiFi config from user
const wifiConfig = { ssid: 'Office', password: '...' };

// 4c. Detect and flash devices
const devices = await api.get('/api/deploy/devices');
for (const device of devices) {
  await api.post('/api/deploy/flash', {
    node_id: spec.nodes[i].node_id,
    port: device.port,
    wifi_config: wifiConfig,
  });
}
// Watch flash progress via WebSocket

// 5. Monitor live system
// Connect to cloud server's MQTT WebSocket for real-time data
const mqttWs = new WebSocket(terraformOutputs.mqtt_ws_url);
```

## Future Enhancements

- [x] ESP32 simulation via Wokwi API
- [x] Terraform integration for cloud deployment
- [x] Hardware flashing (ESP32, STM32)
- [ ] Parallel multi-node Wokwi simulation
- [ ] AVR simulation via simavr
- [ ] Virtual CAN bus between STM32 nodes
- [ ] Real-time dashboard showing all node outputs
- [ ] OTA firmware updates post-deployment
