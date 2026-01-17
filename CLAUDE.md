# CLAUDE.md - Swarm Architect

## Project Overview

Natural language to distributed embedded systems with simulated verification and cloud aggregation.

**Core flow:**

1. User describes multi-device IoT system in plain English
2. LLM generates firmware for each node + server aggregation code
3. Renode simulates the embedded swarm with inter-device communication
4. Terraform provisions cloud VM running aggregation server
5. Simulated nodes connect to real server for end-to-end validation
6. Iterate until system behaviour matches spec

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER INPUT                                    │
│  "5 temperature sensors reporting to central server every 10s,         │
│   server calculates average and triggers alert if any > 40°C"          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         LLM AGENT                                       │
│  Generates: node firmware, server code, Renode topology, Terraform     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
             ┌──────────┐    ┌──────────┐    ┌──────────┐
             │ Firmware │    │  Server  │    │  Infra   │
             │ per node │    │   Code   │    │ Terraform│
             └──────────┘    └──────────┘    └──────────┘
                    │               │               │
                    ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        SIMULATION LAYER                                 │
│  ┌─────────────────────────────────┐    ┌─────────────────────────────┐│
│  │         RENODE SWARM            │    │      CLOUD VM (Terraform)   ││
│  │  ┌─────┐ ┌─────┐ ┌─────┐       │    │                             ││
│  │  │Node1│ │Node2│ │Node3│ ...   │◄──►│   Aggregation Server        ││
│  │  └─────┘ └─────┘ └─────┘       │    │   (MQTT/HTTP endpoint)      ││
│  │       CAN/UART between nodes    │    │                             ││
│  └─────────────────────────────────┘    └─────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         TEST HARNESS                                    │
│  - Inject sensor values into Renode nodes                              │
│  - Verify server receives expected aggregated data                     │
│  - Assert alerting behaviour                                           │
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
│   ├── system_parser.py      # NL → structured spec
│   ├── firmware_gen.py       # Spec → C code per node
│   ├── server_gen.py         # Spec → aggregation server code
│   ├── protocol_gen.py       # Shared protocol definitions
│   └── prompts/              # System prompts for generation
│       ├── system_decomposition.md
│       ├── firmware_template.md
│       └── server_template.md
├── renode/                   # Simulation orchestration (Backend)
│   ├── __init__.py
│   ├── orchestrator.py       # Dynamic .resc generation, lifecycle
│   ├── network_bridge.py     # Connect simulated nodes to real network
│   ├── templates/
│   │   ├── stm32f4.repl
│   │   └── base_setup.resc
│   └── scripts/
│       └── test_injection.py
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
│   ├── main.py               # FastAPI/Flask app template
│   ├── mqtt_handler.py       # MQTT ingestion
│   └── alerting.py           # Threshold logic
├── tests/                    # Test framework (Backend)
│   ├── __init__.py
│   ├── runner.py
│   ├── assertions.py
│   └── scenarios/
│       └── example_scenario.yaml
├── frontend/                 # Visualisation (Frontend)
│   ├── package.json
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── TopologyGraph.tsx
│   │   │   ├── MessageTimeline.tsx
│   │   │   ├── NodeStatus.tsx
│   │   │   ├── ServerMetrics.tsx
│   │   │   └── SpecEditor.tsx
│   │   ├── hooks/
│   │   │   └── useSimulation.ts
│   │   └── api/
│   │       └── client.ts
│   └── public/
├── builds/                   # Generated artifacts (gitignored)
│   ├── firmware/
│   ├── server/
│   └── renode/
├── api/                      # Backend API for frontend (Backend)
│   ├── __init__.py
│   ├── main.py               # FastAPI app
│   ├── routes/
│   │   ├── generate.py
│   │   ├── simulate.py
│   │   └── deploy.py
│   └── websocket.py          # Live simulation updates
└── docker-compose.yaml       # Local dev environment
```

---

## Tech Stack

### Backend

- **Language:** Python 3.11+
- **API:** FastAPI with WebSocket support
- **LLM:** Claude API (claude-sonnet-4-20250514)
- **Simulation:** Renode 1.14+
- **Infra:** Terraform 1.5+, targeting AWS/GCP/Azure (pick one, stick to it)
- **Server runtime:** Docker container on provisioned VM
- **Protocol:** MQTT (Mosquitto) for IoT→Server, HTTP for control plane

### Frontend

- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript
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
- WebSocket for live simulation updates

```
WS /ws/simulation/{session_id}

Messages:
→ {"type": "start", "spec": "..."}
← {"type": "node_spawned", "node_id": "sensor_1", "status": "running"}
← {"type": "message", "from": "sensor_1", "to": "server", "payload": {...}}
← {"type": "test_result", "passed": true, "details": "..."}
← {"type": "error", "message": "Compilation failed", "node_id": "sensor_2"}
```

---

## Key Technical Decisions

### Renode Network Bridge

Simulated nodes need to reach the real aggregation server. Options:

1. **TAP interface** - Renode supports this, bridges to host network
2. **Port forwarding** - Renode exposes simulated UART/ETH to host port
3. **Mock at boundary** - Don't actually connect; mock server responses in Renode

**Decision:** Start with option 3 for hackathon (least complexity), stretch to option 1 if time.

### LLM Iteration Strategy

When tests fail:

1. Extract: compilation errors, runtime logs, assertion failures
2. Construct repair prompt with failing context only
3. Regenerate only affected node(s), not entire system
4. Max 3 iterations before surfacing to user

### Terraform Lifecycle

- `terraform apply` on "deploy" action from frontend
- `terraform destroy` on session end or timeout (30 min default)
- Output server IP/endpoint fed back to Renode bridge config

---

## Environment Variables

```bash
# Backend
ANTHROPIC_API_KEY=sk-ant-...
RENODE_PATH=/opt/renode/renode

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

# Verify Renode
renode --version

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
pytest tests/ -v

# Single scenario
pytest tests/test_scenarios.py::test_temperature_swarm -v
```

### Frontend

```bash
cd frontend
npm run test
npm run e2e  # If Playwright configured
```

### Manual Renode Verification

```bash
renode --console
(monitor) include @renode/templates/base_setup.resc
(monitor) start
(monitor) sysbus.uart0 CreateFileBackend @/tmp/uart.log
```

---

## API Endpoints (Backend Team)

| Method | Path                   | Description                |
| ------ | ---------------------- | -------------------------- |
| POST   | `/api/generate`        | NL spec → generated system |
| POST   | `/api/simulate/start`  | Start Renode simulation    |
| POST   | `/api/simulate/stop`   | Stop simulation            |
| GET    | `/api/simulate/status` | Current simulation state   |
| POST   | `/api/deploy`          | Terraform apply for server |
| DELETE | `/api/deploy`          | Terraform destroy          |
| POST   | `/api/test/run`        | Execute test scenario      |
| WS     | `/ws/simulation/{id}`  | Live updates               |

---

## Frontend Pages (Frontend Team)

| Route            | Purpose                            |
| ---------------- | ---------------------------------- |
| `/`              | Landing, spec input                |
| `/design/{id}`   | Topology editor, generation status |
| `/simulate/{id}` | Live simulation view, message flow |
| `/results/{id}`  | Test results, logs, export         |

---

## Definition of Done (Hackathon)

### Minimum Viable Demo

- [ ] User enters NL description
- [ ] System generates firmware for 3+ nodes
- [ ] Renode simulation runs with visible message passing
- [ ] Basic test assertions pass/fail displayed
- [ ] Server receives data (even if mocked)

### Stretch

- [ ] Real Terraform-deployed server receiving data
- [ ] Iteration loop fixes failing tests
- [ ] Message timeline visualisation
- [ ] Hardware deployment path documented

---

## Known Gotchas

1. **Renode CAN simulation** requires specific platform files; STM32F4 Discovery is well-supported
2. **Renode startup is slow** (~5s); don't restart for each test, reset state instead
3. **Claude may generate non-compiling code**; always compile before simulate, feed errors back
4. **Terraform state** can get corrupted if interrupted; use `-lock=false` for hackathon speed
5. **MQTT in Renode** isn't native; simulated nodes likely use UART→bridge→MQTT pattern

---

## Quick Commands

```bash
# Generate firmware for a spec
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"spec": "3 temperature sensors, 1 controller, CAN bus"}'

# Start simulation
curl -X POST http://localhost:8000/api/simulate/start \
  -H "Content-Type: application/json" \
  -d '{"session_id": "abc123"}'

# Deploy infrastructure
curl -X POST http://localhost:8000/api/deploy \
  -d '{"session_id": "abc123"}'
```

---

## Contact / Escalation

During hackathon:

- Backend blockers → check Renode Discord, Antmicro docs
- LLM issues → simplify prompt, reduce scope
- Terraform issues → fall back to local Docker server
- Frontend blockers → ship ugly, functionality first
