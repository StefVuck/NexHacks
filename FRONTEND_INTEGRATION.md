# Frontend Integration Guide - Updated

**Last Updated**: 2026-01-17  
**Backend API Status**: ✅ Fully Functional

## 🚀 Quick Start for Frontend Team

### Backend API is Running

The FastAPI backend is now complete and running at:
- **Base URL**: `http://localhost:8000`
- **Interactive Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### Start the Backend

```bash
cd /Users/manu/Developer/NexHacks
source .venv/bin/activate
uvicorn api.main:app --reload --port 8000
```

## 📡 API Endpoints Reference

### Stage 1: Design

#### Parse Natural Language Prompt
```typescript
POST /api/design/parse
Request: {
  prompt: string;
  board_id?: string;  // Default: "lm3s6965"
}
Response: {
  design_id: string;
  description: string;
  nodes: Array<{
    node_id: string;
    description: string;
    board_id: string;
    position?: { x: number; y: number };
    assertions: Array<{ name: string; pattern: string }>;
  }>;
  created_at: string;
}
```

#### Save Design
```typescript
POST /api/design/save
Request: SystemDesign (same as parse response)
Response: { status: "saved", design_id: string }
```

#### Get Design
```typescript
GET /api/design/{design_id}
Response: SystemDesign
```

#### List All Designs
```typescript
GET /api/design/
Response: { designs: SystemDesign[] }
```

### Stage 2: Build (Fully Functional ✅)

#### Start Build
```typescript
POST /api/build/start
Request: {
  description: string;
  board_id: string;  // "lm3s6965" | "stm32f103c8" | "esp32" etc.
  nodes: Array<{
    node_id: string;
    description: string;
    assertions: Array<{
      name: string;
      pattern: string;
      required?: boolean;  // Default: true
    }>;
  }>;
}
Response: {
  session_id: string;
  status: "started";
  message: string;
}
```

#### Get Build Status
```typescript
GET /api/build/{session_id}/status
Response: {
  session_id: string;
  status: "idle" | "running" | "success" | "failed";
  current_node?: string;
  current_iteration: number;
  results: {
    [node_id: string]: Array<{
      iteration: number;
      success: boolean;
      compiled: boolean;
      simulated: boolean;
      tests_passed: boolean;
    }>;
  };
}
```

#### Stop Build
```typescript
POST /api/build/{session_id}/stop
Response: { status: "cancelled" | "not_running" }
```

### Stage 3: Simulate

#### Start Simulation
```typescript
POST /api/simulate/start
Request: {
  session_id: string;
  timeout_seconds?: number;  // Default: 30.0
}
Response: {
  status: "running";
  message: string;
}
```

#### Stop Simulation
```typescript
POST /api/simulate/stop?session_id={session_id}
Response: { status: "stopped" }
```

#### Get Simulation Status
```typescript
GET /api/simulate/status?session_id={session_id}
Response: {
  session_id: string;
  status: "idle" | "running" | "stopped";
  nodes: object;
}
```

### Stage 4: Deploy

#### List USB Devices
```typescript
GET /api/deploy/devices
Response: Array<{
  port: string;           // "/dev/tty.usbserial-0001"
  description: string;    // "USB Serial Device"
  vid?: string;
  pid?: string;
  board_type?: string;    // "esp32" | "stm32" | "unknown"
}>
```

#### Flash Firmware
```typescript
POST /api/deploy/flash
Request: {
  session_id: string;
  node_id: string;
  port: string;
}
Response: {
  status: "started";
  message: string;
}
```

#### Deploy to Cloud
```typescript
POST /api/deploy/cloud
Request: {
  session_id: string;
  swarm_id: string;
  region?: string;        // Default: "us-east-1"
  instance_type?: string; // Default: "t3.micro"
}
Response: {
  status: "started";
  message: string;
}
```

#### Destroy Cloud Resources
```typescript
DELETE /api/deploy/cloud?session_id={session_id}
Response: {
  status: "started";
  message: string;
}
```

#### Get Deploy Status
```typescript
GET /api/deploy/status?session_id={session_id}
Response: {
  session_id: string;
  flash_status: {
    [node_id: string]: {
      status: string;
      port: string;
      progress: number;
    };
  };
  cloud_status?: {
    status: string;
    swarm_id: string;
    region: string;
  };
}
```

## 🔌 WebSocket Integration

### Connect to WebSocket
```typescript
const ws = new WebSocket(`ws://localhost:8000/ws/${sessionId}`);

ws.onopen = () => {
  console.log('Connected to backend');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  handleWebSocketEvent(data);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from backend');
};
```

### WebSocket Event Types

#### Connection Events
```typescript
// Received on connection
{
  type: "connected";
  session_id: string;
  message: "WebSocket connected";
}

// Send ping to keep alive
ws.send(JSON.stringify({ type: "ping" }));

// Receive pong
{ type: "pong" }
```

#### Build Stage Events
```typescript
// Iteration update
{
  stage: "build";
  type: "iteration_update";
  data: {
    node_id: string;
    iteration: number;
    status: "running" | "success" | "failed";
  };
}

// Build complete
{
  stage: "build";
  type: "complete";
  data: {
    success: boolean;
    results: object;
  };
}

// Build error
{
  stage: "build";
  type: "error";
  data: {
    message: string;
  };
}
```

#### Simulate Stage Events
```typescript
{
  stage: "simulate";
  type: "node_started" | "output" | "message" | "test_result";
  data: object;
}
```

#### Deploy Stage Events
```typescript
{
  stage: "deploy";
  type: "device_detected" | "flash_progress" | "flash_complete" | 
        "terraform_status" | "server_ready";
  data: object;
}
```

## 📋 Complete Frontend Flow Example

### React/TypeScript Example

```typescript
import { useState, useEffect } from 'react';

interface BuildRequest {
  description: string;
  board_id: string;
  nodes: Array<{
    node_id: string;
    description: string;
    assertions: Array<{ name: string; pattern: string }>;
  }>;
}

function useBuildFlow() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [ws, setWs] = useState<WebSocket | null>(null);

  const startBuild = async (request: BuildRequest) => {
    const response = await fetch('http://localhost:8000/api/build/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    
    const data = await response.json();
    setSessionId(data.session_id);
    
    // Connect WebSocket
    const websocket = new WebSocket(`ws://localhost:8000/ws/${data.session_id}`);
    
    websocket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      
      if (msg.stage === 'build') {
        if (msg.type === 'iteration_update') {
          console.log(`${msg.data.node_id}: ${msg.data.status}`);
        } else if (msg.type === 'complete') {
          setStatus('success');
        } else if (msg.type === 'error') {
          setStatus('failed');
        }
      }
    };
    
    setWs(websocket);
  };

  const stopBuild = async () => {
    if (sessionId) {
      await fetch(`http://localhost:8000/api/build/${sessionId}/stop`, {
        method: 'POST',
      });
    }
  };

  useEffect(() => {
    return () => {
      ws?.close();
    };
  }, [ws]);

  return { startBuild, stopBuild, status, sessionId };
}

// Usage in component
function BuildPanel() {
  const { startBuild, status } = useBuildFlow();

  const handleBuild = () => {
    startBuild({
      description: "Temperature monitoring system",
      board_id: "lm3s6965",
      nodes: [
        {
          node_id: "sensor_1",
          description: "Read temperature every second, print to UART",
          assertions: [
            { name: "has_temp", pattern: "temp=" },
            { name: "has_value", pattern: "C" }
          ]
        }
      ]
    });
  };

  return (
    <div>
      <button onClick={handleBuild}>Start Build</button>
      <p>Status: {status}</p>
    </div>
  );
}
```

## 🎨 Available Boards

Frontend should provide these board options:

```typescript
const BOARDS = [
  { id: "lm3s6965", name: "LM3S6965 Stellaris", flash: "256KB", ram: "64KB", qemu: true },
  { id: "stm32f103c8", name: "STM32F103 Blue Pill", flash: "64KB", ram: "20KB", qemu: true },
  { id: "stm32f401re", name: "STM32F401 Nucleo", flash: "512KB", ram: "96KB", qemu: true },
  { id: "stm32f407vg", name: "STM32F407 Discovery", flash: "1024KB", ram: "192KB", qemu: true },
  { id: "arduino_due", name: "Arduino Due", flash: "512KB", ram: "96KB", qemu: true },
  { id: "esp32", name: "ESP32", flash: "4096KB", ram: "520KB", qemu: false },
  { id: "arduino_uno", name: "Arduino Uno", flash: "32KB", ram: "2KB", qemu: false },
];
```

## 🧪 Testing the API

### Using curl
```bash
# Health check
curl http://localhost:8000/health

# Start a build
curl -X POST http://localhost:8000/api/build/start \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Counter test",
    "board_id": "lm3s6965",
    "nodes": [{
      "node_id": "counter",
      "description": "Count from 1 to 5",
      "assertions": [
        {"name": "has_1", "pattern": "1"},
        {"name": "has_5", "pattern": "5"}
      ]
    }]
  }'

# Get status (replace SESSION_ID)
curl http://localhost:8000/api/build/SESSION_ID/status
```

### Using Python
```bash
python scripts/test_api.py
```

## 🔧 CORS Configuration

The API allows requests from:
- `http://localhost:3000` (Next.js)
- `http://localhost:5173` (Vite)

If your frontend runs on a different port, update `api/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:YOUR_PORT",  # Add your port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 📊 Session Management

- Each build creates a unique session ID
- Sessions track build status, results, and WebSocket connections
- Sessions are stored in-memory (will reset on server restart)
- Future: Add database persistence for production

## ⚠️ Known Limitations

1. **Design Parser**: Currently returns placeholder data. Full Claude integration pending.
2. **Hardware Flashing**: Endpoints created but need `flasher` module integration.
3. **Terraform**: Endpoints created but need subprocess integration.
4. **Session Persistence**: In-memory only, will be lost on restart.

## 🎯 What's Working Now

✅ **Build Stage**: Fully functional
- Start build with natural language descriptions
- Real-time WebSocket updates
- Automatic firmware generation, compilation, and simulation
- Test assertion validation
- Retry logic (up to 3 iterations)

✅ **API Infrastructure**: Complete
- All endpoints defined
- Session management
- WebSocket broadcasting
- CORS configured
- Health checks

✅ **Documentation**: Available
- Interactive API docs at `/docs`
- This integration guide
- Example code snippets

## 🚧 Next Steps for Frontend

1. **Implement Build UI**
   - Form to input system description
   - Board selector
   - Node configuration
   - Start build button

2. **Add Real-time Progress Display**
   - Connect to WebSocket
   - Show iteration progress
   - Display compilation/simulation results
   - Show test results

3. **Create Visualization Dashboard**
   - Node topology view
   - Build status indicators
   - Log output display

4. **Add Deploy UI** (when backend integration complete)
   - Device detection
   - Flash progress
   - Cloud deployment controls

## 📞 Support

For questions or issues:
- Check API docs: http://localhost:8000/docs
- Review `api/README.md`
- Test with `scripts/test_api.py`
- Check server logs for errors

---

**Backend Team**: API is ready for integration! 🎉
