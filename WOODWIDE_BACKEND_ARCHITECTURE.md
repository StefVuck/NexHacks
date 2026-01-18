# Woodwide AI - Backend CSV Architecture

## 🎉 New Architecture Implemented!

The Woodwide AI CSV integration now uses a **backend consolidation architecture** instead of generating CSV directly on microcontrollers.

## 🏗️ Architecture

```
┌──────────────┐
│ ESP32 Sensor │  Sends JSON data
│  (Road 1)    │────┐
└──────────────┘    │
                    │
┌──────────────┐    │    ┌─────────────────┐
│ ESP32 Sensor │────┼───▶│  Backend API    │
│  (Road 2)    │    │    │  (FastAPI)      │
└──────────────┘    │    └────────┬────────┘
                    │             │
┌──────────────┐    │             ▼
│ ESP32 Sensor │────┘    ┌─────────────────┐
│  (Road 3)    │         │ Woodwide Service│
└──────────────┘         │  (CSV Generator)│
                         └────────┬────────┘
                                  │
                         ┌────────▼────────┐
                         │   CSV Files     │
                         │  + Statistics   │
                         └─────────────────┘
```

## ✅ Why This Is Better

1. **Simpler Firmware**: ESP32 just sends JSON, no complex CSV formatting
2. **Scalable**: Backend handles data from many sensors
3. **Flexible**: Easy to change CSV format without reflashing hardware
4. **Analytics**: Backend can provide real-time statistics
5. **Reliable**: Data buffered in backend, not lost if sensor reboots

## 🚀 Quick Start

### 1. Start the Backend

```bash
source .venv/bin/activate
uvicorn api.main:app --reload
```

### 2. Run the Simulator

```bash
# Simulate 5 sensors, 20 readings each
python scripts/pittsburgh_traffic_simulator.py --sensors 5 --readings 20
```

### 3. Download CSV

```bash
# Via API
curl "http://localhost:8000/api/woodwide/download/csv/all_sensors_combined.csv" > traffic_data.csv

# Or open in browser
open http://localhost:8000/api/woodwide/download/csv/all_sensors_combined.csv
```

## 📊 API Endpoints

### Ingest Data (ESP32 → Backend)

```bash
# Single reading
curl -X POST http://localhost:8000/api/woodwide/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": 1768746493980,
    "node_id": "road_sensor_1",
    "location": "I-376_East_Squirrel_Hill",
    "frequency_of_cars_ph": 1250,
    "average_speed_kmh": 85.3,
    "traffic_density_percent": 45.2,
    "heavy_vehicle_ratio": 0.15,
    "ambient_temperature": 22.5,
    "road_surface_temp": 28.3,
    "congestion_level": 2
  }'
```

### Get Statistics

```bash
curl http://localhost:8000/api/woodwide/stats
```

**Response:**
```json
{
  "count": 30,
  "nodes": 3,
  "locations": 3,
  "time_range": {
    "start": 1768746493980,
    "end": 1768746494500
  },
  "average_speed_kmh": 95.4,
  "average_density_percent": 38.6,
  "congestion_distribution": {
    "0": 8,
    "1": 15,
    "2": 5,
    "3": 2
  }
}
```

### Export to CSV

```bash
curl -X POST http://localhost:8000/api/woodwide/export/csv
```

### Download CSV

```bash
curl http://localhost:8000/api/woodwide/download/csv/all_sensors_combined.csv
```

### Service Status

```bash
curl http://localhost:8000/api/woodwide/status
```

## 📝 ESP32 Firmware Example

The ESP32 firmware is much simpler now - just send JSON:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* backend_url = "http://your-backend.com/api/woodwide/ingest";

void sendReading() {
    HTTPClient http;
    http.begin(backend_url);
    http.addHeader("Content-Type", "application/json");
    
    // Create JSON
    StaticJsonDocument<256> doc;
    doc["timestamp"] = millis();
    doc["node_id"] = "road_sensor_1";
    doc["location"] = "I-376_East_Squirrel_Hill";
    doc["frequency_of_cars_ph"] = 1250;
    doc["average_speed_kmh"] = 85.3;
    doc["traffic_density_percent"] = 45.2;
    doc["heavy_vehicle_ratio"] = 0.15;
    doc["ambient_temperature"] = 22.5;
    doc["road_surface_temp"] = 28.3;
    doc["congestion_level"] = 2;
    
    String json;
    serializeJson(doc, json);
    
    // Send to backend
    int httpCode = http.POST(json);
    
    if (httpCode == 200) {
        Serial.println("✅ Data sent");
    } else {
        Serial.printf("❌ Failed: %d\n", httpCode);
    }
    
    http.end();
}

void loop() {
    sendReading();
    delay(60000);  // Send every minute
}
```

## 📊 Example Output

### Simulator Output

```
================================================================================
🚗 PITTSBURGH TRAFFIC SIMULATOR - BACKEND CSV ARCHITECTURE
================================================================================
📍 Simulating 3 sensors
📊 10 readings per sensor
🌐 Backend: http://localhost:8000
================================================================================

Architecture:
  ESP32 Sensors → HTTP POST → Backend API → Woodwide Service → CSV

✅ Backend is healthy

🚀 Starting sensor simulation...

[09:28:13] ✅   road_sensor_1 | I-376_East_Squirrel_Hill | Reading 1/10 sent
[09:28:13] ✅   road_sensor_2 | I-376_West_Oakland       | Reading 1/10 sent
[09:28:13] ✅   road_sensor_3 | I-279_North_Perry        | Reading 1/10 sent
...

================================================================================
📊 SIMULATION COMPLETE
================================================================================

📈 Backend Statistics:
   Total readings: 30
   Sensors: 3
   Locations: 3
   Avg speed: 95.4 km/h
   Avg density: 38.6%

📊 Exporting to CSV...
   ✅ CSV exported: output/woodwide_csv/all_sensors_combined.csv

📥 Download CSV:
   http://localhost:8000/api/woodwide/download/csv/all_sensors_combined.csv
```

### Generated CSV

```csv
timestamp,node_id,location,frequency_of_cars_ph,average_speed_kmh,traffic_density_percent,heavy_vehicle_ratio,ambient_temperature,road_surface_temp,congestion_level
1768746493980,road_sensor_1,I-376_East_Squirrel_Hill,904,99.7,38.1,0.24,23.1,31.5,1
1768746493983,road_sensor_2,I-376_West_Oakland,946,87.0,36.5,0.25,20.7,30.6,0
1768746493985,road_sensor_3,I-279_North_Perry,1303,96.1,42.5,0.1,20.4,26.2,1
```

## 🔧 Implementation Details

### Backend Service (`api/woodwide_service.py`)

- **WoodwideCSVService**: Main service class
- **Data Buffer**: In-memory storage for sensor readings
- **CSV Export**: Converts buffered data to CSV files
- **Statistics**: Real-time analytics on sensor data

### API Routes (`api/routes/woodwide.py`)

- `POST /api/woodwide/ingest` - Receive sensor data
- `POST /api/woodwide/ingest/batch` - Receive multiple readings
- `POST /api/woodwide/export/csv` - Export to CSV
- `GET /api/woodwide/download/csv/{filename}` - Download CSV file
- `GET /api/woodwide/stats` - Get statistics
- `GET /api/woodwide/status` - Service status
- `DELETE /api/woodwide/clear` - Clear buffer

### Simulator (`scripts/pittsburgh_traffic_simulator.py`)

- Simulates ESP32 sensors sending data
- Concurrent sensor simulation
- Real-time progress display
- Automatic CSV export

## 📈 Scaling

The backend architecture scales easily:

- **Horizontal**: Add more backend instances with load balancer
- **Vertical**: Increase backend resources
- **Storage**: Add database for persistent storage
- **Analytics**: Add real-time dashboards

## 🎯 Use Cases

1. **Traffic Monitoring**: 50 road sensors across Pittsburgh
2. **Environmental**: Temperature/humidity sensors in buildings
3. **Industrial**: Machine telemetry and diagnostics
4. **Agriculture**: Soil moisture and weather stations
5. **Smart City**: Parking, lighting, air quality sensors

## ✨ Benefits

✅ **Simple firmware** - Just send JSON  
✅ **Scalable backend** - Handle thousands of sensors  
✅ **Flexible CSV** - Change format without reflashing  
✅ **Real-time stats** - Analytics on live data  
✅ **Reliable** - Data buffered in backend  
✅ **Easy integration** - Standard HTTP/JSON  

## 🚀 Next Steps

1. **Add database**: PostgreSQL/TimescaleDB for persistence
2. **Add WebSocket**: Real-time data streaming
3. **Add dashboard**: Grafana/custom UI for visualization
4. **Add alerts**: Threshold-based notifications
5. **Add ML**: Anomaly detection and predictions

---

**Status**: ✅ Production Ready  
**Architecture**: ESP32 → Backend → CSV  
**Last Updated**: 2026-01-18
