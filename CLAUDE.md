# CLAUDE.md - Swarm Architect

## Project Overview

Natural language to distributed embedded systems with simulated verification, visualization, and real hardware deployment.

**Four-Stage Flow:**

```
┌─────────┐    ┌─────────┐    ┌───────────┐    ┌─────────┐
│ DESIGN  │ -> │  BUILD  │ -> │ VISUALIZE │ -> │ DEPLOY  │
└─────────┘    └─────────┘    └───────────┘    └─────────┘
```

### Stage 1: Design
- **Option A:** User describes system in plain English prompt
- **Option B:** User places devices on interactive map/canvas
- **Option C:** LLM suggests device placement based on prompt
- Output: System spec with node positions, board types, and connections

### Stage 2: Build (Iterative Loop)
- Claude generates firmware for each node + server code
- Compile firmware for target boards (ARM/ESP32)
- Simulate in QEMU (STM32) or Wokwi (ESP32)
- Run test assertions against output
- If tests fail: feed errors back to Claude, regenerate (max 3 iterations)
- Output: Working firmware binaries + server code

### Stage 3: Visualize
- Real-time simulation dashboard
- Message flow between nodes (MQTT/HTTP traffic)
- Node status indicators (running, error, idle)
- Test assertion results
- Server metrics and received data

### Stage 4: Deploy
- **Hardware:** Connect USB, detect boards, flash firmware (esptool/stm32flash)
- **Cloud:** Terraform provisions aggregation server (AWS/GCP/Azure)
- **Verify:** Real devices communicate with deployed server
- Output: Production-ready distributed system

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        STAGE 1: DESIGN                                  │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │      TEXT PROMPT            │  │       VISUAL MAP EDITOR         │  │
│  │  "5 temp sensors in         │  │    ┌───┐         ┌───┐         │  │
│  │   warehouse corners..."     │  │    │ S1├────┐    │ S2│         │  │
│  └──────────────┬──────────────┘  │    └───┘    │    └─┬─┘         │  │
│                 │                 │         ┌───┴──┐   │           │  │
│                 │                 │         │Server│◄──┘           │  │
│                 └────────┬────────┘         └──────┘               │  │
│                          │        └─────────────────────────────────┘  │
│                          ▼                                             │
│                 ┌─────────────────┐                                    │
│                 │  LLM: Parse &   │                                    │
│                 │  Suggest Layout │                                    │
│                 └────────┬────────┘                                    │
└──────────────────────────┼──────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        STAGE 2: BUILD LOOP                              │
│                                                                         │
│    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐       │
│    │ Generate │ -> │ Compile  │ -> │ Simulate │ -> │  Test    │       │
│    │ Firmware │    │ (GCC)    │    │(QEMU/Wok)│    │ Assert   │       │
│    └──────────┘    └──────────┘    └──────────┘    └────┬─────┘       │
│         ▲                                               │              │
│         │              ┌──────────┐                     │              │
│         └──────────────│  Fail?   │◄────────────────────┘              │
│           Feed errors  │ Retry≤3  │                                    │
│                        └──────────┘                                    │
└─────────────────────────────────────────────────────────────────────────┘
                           │ Success
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      STAGE 3: VISUALIZE                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    SIMULATION DASHBOARD                          │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │   │
│  │  │  Topology View  │  │  Message Flow   │  │  Test Results   │  │   │
│  │  │   [S1]──[Svr]   │  │  S1->Svr: temp  │  │  ✓ has_temp     │  │   │
│  │  │   [S2]──┘       │  │  S2->Svr: temp  │  │  ✓ avg_calc     │  │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                           │ User approves
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       STAGE 4: DEPLOY                                   │
│                                                                         │
│  ┌─────────────────────────────┐    ┌─────────────────────────────┐    │
│  │     HARDWARE FLASH          │    │      CLOUD DEPLOY           │    │
│  │  ┌─────┐  USB  ┌─────┐     │    │                             │    │
│  │  │ PC  │◄─────►│Board│     │    │   terraform apply           │    │
│  │  └─────┘       └─────┘     │    │   -> EC2/GCE instance       │    │
│  │                            │    │   -> MQTT broker            │    │
│  │  esptool.py / stm32flash   │    │   -> Aggregation server     │    │
│  └─────────────────────────────┘    └─────────────────────────────┘    │
│                                                                         │
│                    Real devices ◄──── MQTT/HTTP ────► Cloud server     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Team Structure

| Team     | Members | Owns                                               |
| -------- | ------- | -------------------------------------------------- |
| Frontend | 2       | `frontend/`, visualisation, demo UI                |
| Backend  | 2       | `agent/`, `renode/`, `infra/`, `server/`, `tests/` |

---

## Repository Structure

```
swarm-architect/
├── CLAUDE.md
├── agent/                    # LLM orchestration (Backend)
│   ├── __init__.py
│   ├── orchestrator.py       # Main generation loop (STM32/ARM)
│   ├── esp32_orchestrator.py # ESP32 generation loop (Wokwi)
│   ├── boards.py             # Board configs with constraints
│   ├── templates.py          # Code templates per board/feature
│   └── prompts/              # System prompts for generation
├── simulator/                # Simulation backends (Backend)
│   ├── __init__.py
│   ├── orchestrator.py       # QEMU runner for ARM boards
│   └── wokwi.py              # Wokwi API client for ESP32
├── flasher/                  # Hardware flashing (Backend)
│   ├── __init__.py
│   ├── detector.py           # USB device detection
│   ├── esp32.py              # esptool.py wrapper
│   ├── stm32.py              # stm32flash wrapper
│   └── arduino.py            # avrdude wrapper
├── infra/                    # Terraform configs (Backend)
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── modules/
│       └── aggregation_server/
│           ├── main.tf
│           └── cloud_init.yaml
├── server/                   # Aggregation server template (Backend)
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py               # FastAPI app template
│   ├── mqtt_handler.py       # MQTT ingestion
│   └── alerting.py           # Threshold logic
├── api/                      # Backend API for frontend (Backend)
│   ├── __init__.py
│   ├── main.py               # FastAPI app
│   ├── routes/
│   │   ├── design.py         # Stage 1: spec + layout
│   │   ├── build.py          # Stage 2: generate + compile
│   │   ├── simulate.py       # Stage 3: run + visualize
│   │   └── deploy.py         # Stage 4: flash + terraform
│   └── websocket.py          # Live updates for all stages
├── frontend/                 # UI (Frontend)
│   ├── package.json
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── DeviceMap.tsx       # Drag-drop device placement
│   │   │   ├── PromptInput.tsx     # NL description input
│   │   │   ├── BuildProgress.tsx   # Iteration status
│   │   │   ├── TopologyGraph.tsx   # Live simulation view
│   │   │   ├── MessageTimeline.tsx # MQTT/HTTP traffic
│   │   │   ├── TestResults.tsx     # Assertion pass/fail
│   │   │   ├── FlashPanel.tsx      # USB detection + flash
│   │   │   └── DeployPanel.tsx     # Terraform status
│   │   ├── hooks/
│   │   │   ├── useDesign.ts
│   │   │   ├── useBuild.ts
│   │   │   ├── useSimulation.ts
│   │   │   └── useDeploy.ts
│   │   └── api/
│   │       └── client.ts
│   └── public/
├── builds/                   # Generated artifacts (gitignored)
│   ├── firmware/
│   └── server/
├── scripts/                  # Test scripts
│   ├── test_loop.py          # QEMU integration test
│   └── test_esp32.py         # Wokwi integration test
└── docker-compose.yaml       # Local dev environment
```

---

## Tech Stack

### Backend

- **Language:** Python 3.11+
- **API:** FastAPI with WebSocket support
- **LLM:** Claude API (claude-sonnet-4-20250514)
- **Simulation:** QEMU (ARM/STM32), Wokwi (ESP32)
- **Compilation:** arm-none-eabi-gcc (STM32), PlatformIO (ESP32)
- **Flashing:** esptool.py (ESP32), stm32flash (STM32), avrdude (Arduino)
- **Infra:** Terraform 1.5+, targeting AWS/GCP/Azure
- **Server runtime:** Docker container on provisioned VM
- **Protocol:** MQTT (Mosquitto) for IoT→Server, HTTP for control plane

### Frontend

- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript
- **Map Editor:** React Flow (drag-drop device placement)
- **Visualisation:** React Flow (topology), Recharts (metrics)
- **State:** Zustand or React Query
- **Styling:** Tailwind CSS

---

## Coding Conventions

### Python (Backend)

- Use type hints everywhere
- Pydantic models for all data structures crossing boundaries
- No classes unless managing state; prefer functions
- `ruff` for linting, `black` for formatting
- Async where IO-bound (API routes, Renode communication)

```python
# Good
async def generate_firmware(spec: SystemSpec) -> list[NodeFirmware]:
    ...

# Bad
def generateFirmware(spec):
    ...
```

### TypeScript (Frontend)

- Strict mode enabled
- Prefer `interface` over `type` for object shapes
- Components are functions, not classes
- Colocate hooks with components that use them
- No `any` - use `unknown` and narrow

```typescript
// Good
interface NodeStatusProps {
  nodeId: string;
  status: 'running' | 'stopped' | 'error';
}

// Bad
const NodeStatus = (props: any) => ...
```

### Terraform

- All resources tagged with `project = "swarm-architect"`
- Use variables for anything environment-specific
- Outputs for anything frontend/backend needs (IP, endpoint URLs)
- State stored remotely (S3 + DynamoDB or equivalent) if time permits, local otherwise

### General

- No comments for obvious code
- Error messages should be actionable
- Fail fast, surface errors to user

---

## Communication Protocols

### Simulated Nodes ↔ Aggregation Server

**Option A: MQTT (preferred)**

- Topic structure: `swarm/{swarm_id}/nodes/{node_id}/telemetry`
- Payload: JSON `{"timestamp": <unix_ms>, "readings": {"temp": 25.3, ...}}`
- QoS 1 for telemetry, QoS 2 for commands

**Option B: HTTP (simpler fallback)**

- POST `/api/telemetry/{node_id}`
- Same JSON payload

### Frontend ↔ Backend API

- REST for CRUD operations
- WebSocket for live updates across all stages

```
WS /ws/{session_id}

Stage 2: Build
← {"stage": "build", "type": "iteration_start", "node_id": "sensor_1", "iteration": 1}
← {"stage": "build", "type": "compile_result", "node_id": "sensor_1", "success": true}
← {"stage": "build", "type": "compile_result", "node_id": "sensor_1", "success": false, "errors": "..."}
← {"stage": "build", "type": "iteration_complete", "node_id": "sensor_1", "success": true}

Stage 3: Simulate
← {"stage": "simulate", "type": "node_started", "node_id": "sensor_1"}
← {"stage": "simulate", "type": "output", "node_id": "sensor_1", "data": "temp=25"}
← {"stage": "simulate", "type": "message", "from": "sensor_1", "to": "server", "payload": {...}}
← {"stage": "simulate", "type": "test_result", "assertion": "has_temp", "passed": true}

Stage 4: Deploy
← {"stage": "deploy", "type": "device_detected", "port": "/dev/ttyUSB0", "board": "esp32"}
← {"stage": "deploy", "type": "flash_progress", "node_id": "sensor_1", "percent": 45}
← {"stage": "deploy", "type": "flash_complete", "node_id": "sensor_1", "success": true}
← {"stage": "deploy", "type": "terraform_status", "state": "applying", "resource": "aws_instance.server"}
← {"stage": "deploy", "type": "server_ready", "endpoint": "http://1.2.3.4:8080"}
```

---

## Key Technical Decisions

### Simulation Strategy

| Board Type | Simulator | Networking |
|------------|-----------|------------|
| STM32/ARM  | QEMU      | Semihosting output only |
| ESP32      | Wokwi     | Real WiFi/MQTT to internet |
| Arduino    | Future    | - |

**ESP32 advantage:** Wokwi simulates real WiFi, so nodes can connect to actual MQTT brokers during simulation.

### LLM Iteration Strategy

When tests fail:

1. Extract: compilation errors, runtime logs, assertion failures
2. Construct repair prompt with failing context only
3. Regenerate only affected node(s), not entire system
4. Max 3 iterations before surfacing to user

### Hardware Flashing

| Board | Tool | Connection |
|-------|------|------------|
| ESP32 | esptool.py | USB (auto-detect /dev/ttyUSB*) |
| STM32 | stm32flash | UART bootloader |
| Arduino | avrdude | USB |

USB detection via pyserial to list available ports, match against known VID/PID for boards.

### Terraform Lifecycle

- `terraform apply` on "deploy" action from frontend
- `terraform destroy` on session end or timeout (30 min default)
- Output server IP/endpoint shown in deploy panel

---

## Environment Variables

```bash
# Backend
ANTHROPIC_API_KEY=sk-ant-...
WOKWI_CLI_TOKEN=...              # From wokwi.com/dashboard/ci (ESP32 simulation)

# Terraform (pick your cloud)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=eu-west-1

# Or GCP
GOOGLE_PROJECT=...
GOOGLE_CREDENTIALS=...

# Server
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=1883
```

---

## Development Setup

### Backend

```bash
cd swarm-architect
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Install simulation/flash tools
brew install qemu arm-none-eabi-gcc  # macOS
pip install platformio esptool       # ESP32

# Set API key
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env

# Test simulation loop
python scripts/test_loop.py

# Run API
uvicorn api.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev  # localhost:3000
```

### Terraform

```bash
cd infra
terraform init
terraform plan  # Verify config
# Don't apply until backend integration ready
```

---

## Testing

### Backend

```bash
# QEMU simulation test (STM32)
python scripts/test_loop.py

# ESP32 code generation test
python scripts/test_esp32.py

# Full pytest suite
pytest tests/ -v
```

### Frontend

```bash
cd frontend
npm run test
npm run e2e  # If Playwright configured
```

### Manual QEMU Verification

```bash
# Compile bare-metal ARM
arm-none-eabi-gcc -mcpu=cortex-m3 -mthumb -nostdlib -T linker.ld -o test.elf test.c

# Run in QEMU with semihosting
qemu-system-arm -M lm3s6965evb -nographic -semihosting -kernel test.elf
```

---

## API Endpoints (Backend Team)

### Stage 1: Design
| Method | Path                      | Description                          |
| ------ | ------------------------- | ------------------------------------ |
| POST   | `/api/design/parse`       | NL prompt → structured spec          |
| POST   | `/api/design/suggest`     | LLM suggests device layout           |
| POST   | `/api/design/save`        | Save spec + layout                   |
| GET    | `/api/design/{id}`        | Get saved design                     |

### Stage 2: Build
| Method | Path                      | Description                          |
| ------ | ------------------------- | ------------------------------------ |
| POST   | `/api/build/start`        | Start generation loop                |
| GET    | `/api/build/{id}/status`  | Current iteration status             |
| POST   | `/api/build/{id}/stop`    | Cancel build                         |

### Stage 3: Simulate
| Method | Path                      | Description                          |
| ------ | ------------------------- | ------------------------------------ |
| POST   | `/api/simulate/start`     | Start QEMU/Wokwi simulation          |
| POST   | `/api/simulate/stop`      | Stop simulation                      |
| GET    | `/api/simulate/status`    | Simulation state + output            |

### Stage 4: Deploy
| Method | Path                      | Description                          |
| ------ | ------------------------- | ------------------------------------ |
| GET    | `/api/deploy/devices`     | List connected USB devices           |
| POST   | `/api/deploy/flash`       | Flash firmware to device             |
| POST   | `/api/deploy/cloud`       | Terraform apply                      |
| DELETE | `/api/deploy/cloud`       | Terraform destroy                    |
| GET    | `/api/deploy/status`      | Flash progress + cloud status        |

### WebSocket
| Path                       | Description                          |
| -------------------------- | ------------------------------------ |
| WS `/ws/{session_id}`      | Live updates for all stages          |

---

## Frontend Pages (Frontend Team)

| Route              | Stage     | Purpose                              |
| ------------------ | --------- | ------------------------------------ |
| `/`                | -         | Landing, quick start                 |
| `/design/{id}`     | 1: Design | Prompt input OR device map editor    |
| `/build/{id}`      | 2: Build  | Generation progress, iteration view  |
| `/simulate/{id}`   | 3: Viz    | Live topology, message flow, tests   |
| `/deploy/{id}`     | 4: Deploy | USB detection, flash, terraform      |

---

## Definition of Done (Hackathon)

### MVP: Stages 1-3 (Design → Build → Visualize)

- [ ] User can enter NL prompt OR place devices on map
- [ ] LLM generates firmware for 3+ nodes
- [ ] Build loop compiles and simulates (QEMU or Wokwi)
- [ ] Iteration retries on failure (up to 3x)
- [ ] Live visualization shows nodes and message flow
- [ ] Test assertions pass/fail displayed

### Stretch: Stage 4 (Deploy)

- [ ] USB device detection shows connected boards
- [ ] Flash firmware to real ESP32/STM32
- [ ] Terraform deploys aggregation server to cloud
- [ ] Real devices communicate with deployed server
- [ ] End-to-end demo: prompt → working hardware

---

## Known Gotchas

1. **Claude may generate non-compiling code**; always compile before simulate, feed errors back
2. **QEMU semihosting** writes to stderr, not stdout; capture both
3. **Wokwi requires internet** and API token from wokwi.com/dashboard/ci
4. **Terraform state** can get corrupted if interrupted; use `-lock=false` for hackathon speed
5. **USB detection** requires appropriate permissions (udev rules on Linux)
6. **ESP32 flashing** needs esptool.py and board in bootloader mode (hold BOOT, press RESET)
7. **STM32 flashing** via stm32flash requires UART bootloader (BOOT0 pin high)

---

## Quick Commands

```bash
# Test QEMU simulation loop
python scripts/test_loop.py

# Test ESP32 code generation
python scripts/test_esp32.py

# Flash ESP32 manually
esptool.py --port /dev/ttyUSB0 write_flash 0x0 firmware.bin

# Flash STM32 manually
stm32flash -w firmware.bin /dev/ttyUSB0

# Terraform deploy
cd infra && terraform apply -auto-approve
```

---

## Contact / Escalation

During hackathon:

- Backend blockers → check Renode Discord, Antmicro docs
- LLM issues → simplify prompt, reduce scope
- Terraform issues → fall back to local Docker server
- Frontend blockers → ship ugly, functionality first
