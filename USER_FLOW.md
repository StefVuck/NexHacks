# User Flow

Complete user journey through Swarm Architect.

## Flow Overview

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  LAND   │ -> │ DESIGN  │ -> │  BUILD  │ -> │SIMULATE │ -> │ DEPLOY  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
                    │
              ┌─────┴─────┐
              ▼           ▼
         [Prompt]    [Map Editor]
```

---

### Flow

```
[Enter prompt] -> [Generate] -> /design/{id}?mode=ai
       or
[Start from scratch] -> /design/{id}?mode=manual
```

---

## 2. Design Stage (`/design/{id}`)

**Purpose:** Define system topology - what devices, where, what they do.

### Two Modes

#### Mode A: AI-Generated (from prompt)

- Shows suggested device layout on map
- User can adjust positions
- User can add/remove devices
- User can edit device descriptions

#### Mode B: Manual (from scratch)

- Empty map/canvas
- Device palette on side (ESP32, STM32, Arduino)
- Drag devices onto map
- Click device to configure

### Device Configuration (per device)

- Node ID (auto-generated, editable)
- Description (what it does)
- Board type (dropdown: ESP32, STM32F103, etc.)
- Features (checkboxes): WiFi, MQTT, HTTP, DHT sensor, GPS, etc.
- Test assertions (what output to expect)

### Map Features

- Zoom/pan
- Grid snap (optional)
- Draw connections between devices (visual only for now)
- Group selection
- Copy/paste devices

### Settings Modal (gear icon)

Opens overlay with:

#### Project Settings

- Project name
- Swarm ID (auto-generated)

#### Network Settings

- WiFi SSID (for deployment)
- WiFi Password
- MQTT Broker (default: auto from Terraform)
- Custom server URL (optional)

#### Build Settings

- Max iterations (default: 3)
- Timeout per simulation (default: 10s)

#### Cloud Settings (for deploy stage)

- AWS Region (dropdown)
- Instance type (dropdown)
- Auto-destroy timer (hours)

### Actions

- [Save Draft] - Save current state
- [Continue to Build] -> /build/{id}

---

## 3. Build Stage (`/build/{id}`)

**Purpose:** Watch AI generate and test firmware for each device.

### Layout

````
┌────────────────────────────────────────────────────────────┐
│  Node List (left)          │  Detail Panel (right)        │
│  ┌──────────────────────┐  │  ┌────────────────────────┐  │
│  │ sensor_1    [OK]     │  │  │ Generated Code         │  │
│  │ sensor_2    [...]    │  │  │ ```cpp                 │  │
│  │ sensor_3    [wait]   │  │  │ void setup() {...}     │  │
│  │ controller  [wait]   │  │  │ ```                    │  │
│  └──────────────────────┘  │  ├────────────────────────┤  │
│                            │  │ Compilation            │  │
│  Overall: 1/4 complete     │  │ [=====>    ] 60%       │  │
│                            │  ├────────────────────────┤  │
│                            │  │ Test Results           │  │
│                            │  │ ✓ has_temp             │  │
│                            │  │ ✓ sends_mqtt           │  │
│                            │  └────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
````

### Per-Node Status

- Pending (grey)
- Generating... (blue, iteration N/3)
- Compiling... (blue)
- Simulating... (blue)
- Testing... (blue)
- Success (green checkmark)
- Failed (red X, show error)

### Detail Panel (when node selected)

- Generated code (syntax highlighted, collapsible)
- Compilation output (errors/warnings)
- Simulation output (stdout)
- Test results (assertion name, pattern, pass/fail)
- Memory usage (Flash/RAM with limits)

### Error Handling

- If node fails after 3 iterations:
  - Show final error
  - [Retry] button (starts fresh)
  - [Edit Description] button (go back to design)
  - [Skip] button (continue without this node)

### Actions

- [Cancel Build] - Stop all generation
- [Continue to Simulate] -> /simulate/{id} (when all done)

---

## 4. Simulate Stage (`/simulate/{id}`)

**Purpose:** Run full simulation, see devices communicating.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Topology View (main)                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │        [sensor_1]───┐                               │   │
│  │        [sensor_2]───┼──>[MQTT Broker]──>[Server]   │   │
│  │        [sensor_3]───┘                               │   │
│  │                                                      │   │
│  │  Messages flying between nodes (animated)           │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Message Log (bottom)                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 10:23:01  sensor_1 -> broker  {"temp": 24.5}        │   │
│  │ 10:23:01  sensor_2 -> broker  {"temp": 25.1}        │   │
│  │ 10:23:02  server received aggregated data           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Features

- Real-time message flow visualization
- Click node to see its output stream
- Pause/resume simulation
- Speed control (1x, 2x, 5x)
- Filter messages by node

### Side Panel

- Node status (online/offline)
- Latest readings per node
- Alerts triggered
- Server metrics (if applicable)

### Test Summary

- Overall: 12/12 assertions passed
- Per-node breakdown
- [View Details] for each

### Actions

- [Restart Simulation]
- [Back to Build] (if issues found)
- [Continue to Deploy] -> /deploy/{id}

---

## 5. Deploy Stage (`/deploy/{id}`)

**Purpose:** Flash real hardware, provision cloud infrastructure.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Cloud Infrastructure                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Status: Not Deployed                                │   │
│  │                                                      │   │
│  │  [Deploy to AWS]                                     │   │
│  │                                                      │   │
│  │  When deployed:                                      │   │
│  │  - Server IP: 52.1.2.3                              │   │
│  │  - MQTT Broker: 52.1.2.3:1883                       │   │
│  │  - HTTP API: http://52.1.2.3:8080                   │   │
│  │  - [Open Dashboard] [SSH Command] [Destroy]         │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Hardware Devices                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Detected Devices:                                   │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │ /dev/ttyUSB0 - ESP32 (CP210x)               │    │   │
│  │  │ Assign to: [sensor_1 ▼]  [Flash]            │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │ /dev/ttyUSB1 - ESP32 (CH340)                │    │   │
│  │  │ Assign to: [sensor_2 ▼]  [Flash]            │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                                                      │   │
│  │  [Refresh Devices]  [Flash All]                     │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Live Status (after flash)                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  sensor_1: Online - Last seen 2s ago - temp=24.5    │   │
│  │  sensor_2: Online - Last seen 1s ago - temp=25.1    │   │
│  │  sensor_3: Waiting for flash...                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Cloud Section

- Deploy button (disabled until WiFi configured in settings)
- Progress during terraform apply
- Outputs displayed when ready
- Destroy button (with confirmation)

### Hardware Section

- Auto-detect USB devices (poll every 2s)
- Show device info (port, chip, board type guess)
- Dropdown to assign node
- Flash button per device
- Flash progress bar
- Flash All button

### Live Status Section

- Shows after devices flashed + cloud deployed
- Real-time data from server
- Node online/offline status
- Latest readings
- Alerts

### Actions

- [Download Firmware] - ZIP of all .bin files
- [Download Terraform] - Export infra/ folder
- [Export Project] - Full project JSON

---

## Settings Modal

Accessible from any stage via gear icon.

### Tabs

#### General

- Project name
- Swarm ID

#### Network

- WiFi SSID \*
- WiFi Password \*
- Custom MQTT Broker (optional)
- Custom Server URL (optional)

#### Hardware

- Default board type
- Serial baud rate

#### Cloud

- AWS Region
- Instance type
- Auto-destroy (hours, 0 = never)

#### Advanced

- Max build iterations
- Simulation timeout
- Enable debug logging

---

## Navigation

```
Header:
┌─────────────────────────────────────────────────────────────┐
│ [Logo] Swarm Architect    [Design] [Build] [Sim] [Deploy]  │
│                                            [Settings] [?]   │
└─────────────────────────────────────────────────────────────┘

Progress indicator:
  Design ──●── Build ──○── Simulate ──○── Deploy
           ▲
        (current)
```

- Tabs enable/disable based on progress
- Can go back to earlier stages
- Going back doesn't lose work (saved in session)

---

## Edge Cases

### No devices placed

- Can't proceed to Build
- Show message: "Add at least one device"

### Build fails for all nodes

- Offer to go back to Design
- Suggest simplifying descriptions

### No USB devices detected

- Show message: "Connect a device via USB"
- Link to troubleshooting (drivers, permissions)

### Terraform fails

- Show error message
- [Retry] or [Check AWS Console]

### Device disconnected during flash

- Show error
- [Retry when reconnected]

---

## Mobile Considerations

- Design stage: Simplified, no map editor, prompt-only
- Build/Simulate: Works, scrollable lists
- Deploy: May not work (USB access)

---

## Future Enhancements

- [ ] Save/load projects to account
- [ ] Share project link
- [ ] Template library (pre-made systems)
- [ ] Real-time collaboration
- [ ] OTA update existing deployment
- [ ] Cost estimation for cloud
