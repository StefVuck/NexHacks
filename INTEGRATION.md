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

## Future Enhancements

- [x] ESP32 simulation via Wokwi API
- [ ] Parallel multi-node Wokwi simulation
- [ ] AVR simulation via simavr
- [ ] Virtual CAN bus between STM32 nodes
- [ ] Terraform integration for real cloud deployment
- [ ] Real-time dashboard showing all node outputs
