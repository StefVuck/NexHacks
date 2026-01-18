Woodwide CSV Statistics Integration - Implementation Plan
Goal
Integrate CSV-based statistics reporting into the microcontroller firmware generation system. Devices will automatically export telemetry data as CSV files that can be retrieved via serial, SD card, or HTTP endpoints.

User Review Required
IMPORTANT

CSV Retrieval Method: How should CSV files be retrieved from microcontrollers?

Option A: Serial output (print CSV to UART)
Option B: SD card storage (requires SD card hardware)
Option C: HTTP endpoint (ESP32 only, serves CSV via web server)
Option D: All of the above (user specifies in prompt)
IMPORTANT

CSV Format: What statistics should be included by default?

Timestamp
Node ID
Sensor readings (temp, humidity, etc.)
System stats (uptime, memory, errors)
Custom fields from user prompt
Proposed Changes
1. Documentation
[NEW] 
WOODWIDE.md
Complete integration guide covering:

CSV format specification
Retrieval methods (serial, SD, HTTP)
Example prompts for users
Code templates for each method
Integration with existing system
2. Firmware Templates
[MODIFY] 
agent/templates.py
Add CSV generation templates:

CSV_HEADER_TEMPLATE - CSV column headers
CSV_ROW_TEMPLATE - Data row formatting
CSV_SERIAL_TEMPLATE - Print CSV to UART
CSV_SD_TEMPLATE - Write CSV to SD card (STM32/ESP32)
CSV_HTTP_TEMPLATE - Serve CSV via HTTP (ESP32 only)
Integration points:

Add to 
get_template_for_board()
 when user mentions "CSV", "statistics", "data export", or "logging"
Include CSV buffer management (circular buffer for memory efficiency)
Add timestamp generation (millis() or RTC)
3. Agent Prompt Enhancement
[MODIFY] 
agent/orchestrator.py
Update Claude prompts to:

Detect CSV requirements from user description
Include CSV generation code automatically
Format data according to CSV spec
Handle buffer overflow gracefully
Prompt additions:

If the user requests data logging, statistics, or CSV export:
1. Create a CSV buffer with columns: timestamp,node_id,<sensor_fields>
2. Append readings every N seconds
3. Export via [serial/SD/HTTP] based on hardware capabilities
4. Include header row on first export
4. API Models
[MODIFY] 
api/models.py
Add CSV configuration models:

class CSVConfig(BaseModel):
    enabled: bool = False
    method: str = "serial"  # "serial" | "sd" | "http"
    interval_seconds: int = 60
    fields: list[str] = ["timestamp", "node_id"]
    max_rows: int = 1000
Add to 
NodePlacement
 and 
BuildStartRequest
.

5. Example Prompts
Update 
INTEGRATION.md
 with CSV examples:

Example 1: Serial CSV

"Create a temperature sensor that logs readings to CSV every minute 
and prints the CSV to serial port"
Example 2: SD Card CSV

"Build a weather station that saves temperature, humidity, and pressure 
to a CSV file on SD card every 5 minutes"
Example 3: HTTP CSV

"ESP32 sensor that serves CSV data at http://device-ip/data.csv 
with all readings from the past hour"
6. CSV Format Specification
Standard Format:

timestamp,node_id,temperature,humidity,pressure,battery,errors
1234567890,sensor_1,25.3,60.2,1013.25,3.7,0
1234567950,sensor_1,25.4,60.1,1013.20,3.7,0
Fields:

timestamp: Unix timestamp (seconds) or milliseconds since boot
node_id: Unique node identifier
Custom fields: User-defined sensor readings
System fields: uptime, free_memory, error_count
7. Hardware Requirements
Serial CSV: All boards (no extra hardware) SD Card CSV:

STM32: SPI SD card module
ESP32: SD card via SPI or SDIO
Arduino: SD card shield
HTTP CSV: ESP32 only (requires WiFi)

Verification Plan
Automated Tests
Template Generation Test

python scripts/test_csv_templates.py
Verify CSV templates are included when prompted
Check CSV format validity
Test buffer management
Build Test with CSV

# Test serial CSV
curl -X POST http://localhost:8000/api/build/start \
  -d '{"description": "Temperature sensor with CSV logging to serial"}'
# Verify generated code includes CSV functions
Simulation Test

Run QEMU simulation
Capture serial output
Validate CSV format
Check for buffer overflows
Manual Verification
ESP32 HTTP CSV

Build firmware with HTTP CSV
Flash to ESP32
Access http://device-ip/data.csv
Verify CSV download
SD Card CSV

Build firmware with SD CSV
Flash to device with SD card
Remove SD card and check CSV file
Verify data integrity
Implementation Order
Create WOODWIDE.md documentation
Add CSV templates to 
agent/templates.py
Update Claude prompts in 
agent/orchestrator.py
Add CSV models to 
api/models.py
Update 
INTEGRATION.md
 with examples
Create test scripts
Test with real hardware
Risk Assessment
Low Risk:

Serial CSV (simple printf, no dependencies)
Documentation updates
Medium Risk:

SD card CSV (requires hardware, file system)
Buffer management (memory constraints)
High Risk:

HTTP CSV on ESP32 (network complexity)
Large CSV files (memory limits)
Rollback Plan
If issues arise:

CSV generation is optional (disabled by default)
Falls back to simple logging if CSV fails
No breaking changes to existing functionality