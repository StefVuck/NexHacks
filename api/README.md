# Swarm Architect API

FastAPI backend for the Swarm Architect project - natural language to distributed embedded systems.

## Quick Start

### 1. Install Dependencies

```bash
# Already done if you ran requirements.txt
pip install fastapi uvicorn websockets
```

### 2. Start the API Server

```bash
uvicorn api.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### 3. Test the API

```bash
# Health check
curl http://localhost:8000/health

# Run full test suite
python scripts/test_api.py
```

## API Documentation

Once the server is running, visit:
- **Interactive docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Endpoints

### Design Stage
- `POST /api/design/parse` - Parse natural language prompt
- `POST /api/design/suggest` - Get LLM layout suggestions
- `POST /api/design/save` - Save a design
- `GET /api/design/{id}` - Get saved design

### Build Stage
- `POST /api/build/start` - Start firmware generation
- `GET /api/build/{session_id}/status` - Get build status
- `POST /api/build/{session_id}/stop` - Cancel build

### Simulate Stage
- `POST /api/simulate/start` - Start simulation
- `POST /api/simulate/stop` - Stop simulation
- `GET /api/simulate/status` - Get simulation status

### Deploy Stage
- `GET /api/deploy/devices` - List connected USB devices
- `POST /api/deploy/flash` - Flash firmware to device
- `POST /api/deploy/cloud` - Deploy to cloud
- `DELETE /api/deploy/cloud` - Destroy cloud resources
- `GET /api/deploy/status` - Get deployment status

### WebSocket
- `WS /ws/{session_id}` - Real-time updates

## Example: Build Firmware

```python
import requests

# Start a build
response = requests.post("http://localhost:8000/api/build/start", json={
    "description": "Temperature monitoring system",
    "board_id": "lm3s6965",
    "nodes": [
        {
            "node_id": "sensor_1",
            "description": "Read temperature every second, print to UART",
            "assertions": [
                {"name": "has_temp", "pattern": "temp="},
                {"name": "has_value", "pattern": "C"}
            ]
        }
    ]
})

session_id = response.json()["session_id"]

# Poll status
import time
while True:
    status = requests.get(f"http://localhost:8000/api/build/{session_id}/status").json()
    print(f"Status: {status['status']}")
    if status["status"] in ["success", "failed"]:
        break
    time.sleep(1)
```

## WebSocket Example

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/your-session-id');

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Event:', data);
    
    if (data.stage === 'build' && data.type === 'iteration_update') {
        console.log(`Node ${data.data.node_id}: ${data.data.status}`);
    }
};
```

## Architecture

```
api/
├── main.py              # FastAPI app with CORS and routers
├── models.py            # Pydantic models for requests/responses
├── sessions.py          # Session state management
├── websocket.py         # WebSocket handler
└── routes/
    ├── design.py        # Design stage endpoints
    ├── build.py         # Build stage endpoints
    ├── simulate.py      # Simulate stage endpoints
    └── deploy.py        # Deploy stage endpoints
```

## Session Management

Each build/deploy operation creates a session that tracks:
- System specification
- Build results and status
- Simulation results
- Deployment status
- Connected WebSocket clients

Sessions are stored in-memory and can be accessed via their session_id.

## Development

### Running Tests

```bash
# Test the generation loop directly
python scripts/test_loop.py

# Test the API
python scripts/test_api.py
```

### CORS Configuration

The API allows requests from:
- `http://localhost:3000` (Next.js default)
- `http://localhost:5173` (Vite default)

Add more origins in `api/main.py` if needed.

## TODO

- [ ] Integrate flasher.detector for real USB device detection
- [ ] Implement Terraform integration for cloud deploy
- [ ] Add authentication/authorization
- [ ] Persist sessions to database
- [ ] Add rate limiting
- [ ] Implement design parsing with Claude API
- [ ] Add metrics and monitoring
