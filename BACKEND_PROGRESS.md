# Backend Progress

Current status of backend implementation for Swarm Architect.

## Overview

```
Stage 1: Design     [  0%] - Not started
Stage 2: Build      [ 80%] - Core loop working, needs API integration
Stage 3: Simulate   [ 70%] - QEMU working, Wokwi needs token testing
Stage 4: Deploy     [ 60%] - Terraform + flasher written, needs API + testing
```

---

## Stage 2: Build (Code Generation Loop)

### agent/ - LLM Orchestration

| File | Status | Description |
|------|--------|-------------|
| `orchestrator.py` | DONE | Main generation loop for STM32/ARM boards |
| `esp32_orchestrator.py` | DONE | ESP32 loop with Wokwi integration |
| `boards.py` | DONE | 12 board configs with constraints |
| `templates.py` | DONE | WiFi/MQTT/HTTP templates with `{{PLACEHOLDER}}` injection |
| `__init__.py` | DONE | Exports |

**Working features:**
- Generate firmware from natural language
- Compile with arm-none-eabi-gcc
- Enforce memory constraints (Flash/RAM limits)
- Retry loop (max 3 iterations) with error feedback
- Config injection for deployment values

**Tested:**
```bash
python scripts/test_loop.py  # QEMU simulation - PASSING
python scripts/test_esp32.py # Claude API call - PASSING
```

### simulator/ - Simulation Backends

| File | Status | Description |
|------|--------|-------------|
| `orchestrator.py` | DONE | QEMU runner with semihosting |
| `wokwi.py` | WRITTEN | Wokwi API client (needs token to test) |
| `__init__.py` | DONE | Exports |

**Working features:**
- QEMU ARM simulation (lm3s6965, stm32 machines)
- Semihosting output capture (stderr)
- Memory usage validation
- Timeout handling

**Not tested:**
- Wokwi ESP32 simulation (requires `WOKWI_CLI_TOKEN`)

---

## Stage 4: Deploy (Hardware + Cloud)

### flasher/ - Hardware Flashing

| File | Status | Description |
|------|--------|-------------|
| `terraform.py` | DONE | Parse `terraform output -json` |
| `detector.py` | DONE | USB device detection (VID/PID matching) |
| `esp32.py` | DONE | esptool.py wrapper |
| `stm32.py` | DONE | stm32flash / st-flash wrapper |
| `__init__.py` | DONE | Exports |

**Not tested** - needs real hardware connected.

### infra/ - Terraform

| File | Status | Description |
|------|--------|-------------|
| `main.tf` | DONE | AWS EC2 + security group + EIP |
| `variables.tf` | DONE | swarm_id, region, instance_type, ports |
| `outputs.tf` | DONE | server_ip, mqtt_broker, server_url |
| `cloud_init.yaml` | DONE | Bootstrap: Docker, Mosquitto, Python server |
| `terraform.tfvars.example` | DONE | Example config |

**Not tested** - needs AWS credentials.

### server/ - Aggregation Server

| File | Status | Description |
|------|--------|-------------|
| `main.py` | DONE | FastAPI + MQTT subscriber |
| `requirements.txt` | DONE | Dependencies |
| `scripts/__init__.py` | DONE | LLM scripts folder |
| `scripts/example_temp_monitor.py` | DONE | Example handler |

**Features:**
- HTTP API for telemetry ingestion
- MQTT subscription to `swarm/{id}/#`
- Auto-load LLM-generated scripts from `scripts/`
- In-memory telemetry store
- Alerts system

**Not tested** - needs local MQTT broker or cloud deploy.

---

## NOT STARTED

### api/ - FastAPI Backend for Frontend

| File | Needed | Description |
|------|--------|-------------|
| `main.py` | YES | FastAPI app entry point |
| `routes/design.py` | YES | POST /api/design/parse, /suggest, /save |
| `routes/build.py` | YES | POST /api/build/start, GET /status |
| `routes/simulate.py` | YES | POST /api/simulate/start, /stop |
| `routes/deploy.py` | YES | POST /api/deploy/cloud, /flash, GET /devices |
| `websocket.py` | YES | WS /ws/{session_id} for live updates |
| `models.py` | YES | Pydantic models for API |
| `sessions.py` | YES | Session state management |

### Missing Components

| Component | Priority | Description |
|-----------|----------|-------------|
| FastAPI routes | HIGH | Connect frontend to backend |
| WebSocket handler | HIGH | Real-time progress updates |
| Session management | HIGH | Track build/deploy state per session |
| LLM script generator | MEDIUM | Generate server scripts from spec |
| Device map → spec | MEDIUM | Convert visual placement to SystemSpec |
| Multi-node orchestration | LOW | Parallel simulation of multiple nodes |

---

## Test Status

| Test | Status | Command |
|------|--------|---------|
| QEMU loop | PASS | `python scripts/test_loop.py` |
| ESP32 API | PASS | `python scripts/test_esp32.py` |
| Wokwi sim | UNTESTED | Needs `WOKWI_CLI_TOKEN` |
| Terraform | UNTESTED | Needs AWS creds |
| USB flash | UNTESTED | Needs hardware |
| Server | UNTESTED | Needs MQTT broker |

---

## Environment Setup

**Required:**
```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

**Optional (for full functionality):**
```bash
export WOKWI_CLI_TOKEN=...           # ESP32 simulation
export AWS_ACCESS_KEY_ID=...         # Terraform deploy
export AWS_SECRET_ACCESS_KEY=...
```

**Tools:**
```bash
brew install qemu arm-none-eabi-gcc  # QEMU simulation
pip install platformio esptool       # ESP32 compile/flash
brew install stm32flash              # STM32 flash (UART)
brew install stlink                  # STM32 flash (ST-Link)
```

---

## Next Steps (Priority Order)

### 1. FastAPI Routes (HIGH)
Create `api/main.py` and route files to expose:
- `POST /api/build/start` - trigger generation loop
- `GET /api/build/{id}/status` - get current iteration
- `WS /ws/{session_id}` - stream progress

### 2. Session Management (HIGH)
Track per-session state:
- Current spec
- Build results
- Terraform outputs
- Connected devices

### 3. WebSocket Events (HIGH)
Emit events during build/deploy:
```python
await ws.send_json({
    "stage": "build",
    "type": "iteration_complete",
    "node_id": "sensor_1",
    "success": True
})
```

### 4. Test Wokwi Integration (MEDIUM)
Get token from wokwi.com/dashboard/ci and test:
```bash
export WOKWI_CLI_TOKEN=...
python scripts/test_esp32.py  # Update to use full orchestrator
```

### 5. Test Terraform Deploy (MEDIUM)
```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
# Edit with real values
terraform init
terraform apply
```

### 6. Test Hardware Flashing (LOW)
Connect ESP32 via USB and:
```python
from flasher import detect_devices, flash_esp32
devices = detect_devices()
print(devices)
```

---

## File Tree

```
backend/
├── agent/
│   ├── __init__.py          ✅
│   ├── orchestrator.py      ✅ QEMU generation loop
│   ├── esp32_orchestrator.py ✅ Wokwi generation loop
│   ├── boards.py            ✅ 12 board configs
│   └── templates.py         ✅ WiFi/MQTT templates
├── simulator/
│   ├── __init__.py          ✅
│   ├── orchestrator.py      ✅ QEMU runner
│   └── wokwi.py             ✅ Wokwi client (untested)
├── flasher/
│   ├── __init__.py          ✅
│   ├── terraform.py         ✅ Parse TF outputs
│   ├── detector.py          ✅ USB detection
│   ├── esp32.py             ✅ esptool wrapper
│   └── stm32.py             ✅ stm32flash wrapper
├── infra/
│   ├── main.tf              ✅ AWS EC2
│   ├── variables.tf         ✅
│   ├── outputs.tf           ✅
│   └── cloud_init.yaml      ✅ Server bootstrap
├── server/
│   ├── main.py              ✅ Aggregation server
│   ├── requirements.txt     ✅
│   └── scripts/             ✅ LLM handlers go here
├── api/                     ❌ NOT STARTED
│   ├── main.py              ❌
│   ├── routes/              ❌
│   └── websocket.py         ❌
└── scripts/
    ├── test_loop.py         ✅ QEMU test (passing)
    └── test_esp32.py        ✅ API test (passing)
```

---

## Summary

**Done:** Core generation loop, QEMU simulation, board configs, templates, flasher module, Terraform config, aggregation server.

**Blocking:** FastAPI routes to connect frontend to all the backend pieces.

**Testing needed:** Wokwi (needs token), Terraform (needs AWS), Hardware flash (needs device).
