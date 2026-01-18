# Pittsburgh Traffic Monitoring System - CSV Data Generator

Real-time traffic monitoring simulation for 50 road locations across Pittsburgh, generating CSV data with live ticker display.

## Overview

This simulator generates firmware for microcontroller-based traffic sensors deployed across Pittsburgh. Each sensor monitors traffic conditions and exports data in CSV format including:

- **frequency_of_cars_ph**: Cars per hour (50-3000)
- **average_speed_kmh**: Average speed in km/h (15-110)
- **traffic_density_percent**: Traffic density (5-95%)
- **heavy_vehicle_ratio**: Ratio of heavy vehicles (0.05-0.30)
- **ambient_temperature**: Temperature in Celsius (-10 to 40°C)
- **road_surface_temp**: Road surface temperature
- **congestion_level**: Congestion level (0-4)

## Quick Start

### Basic Usage (5 sensors)

```bash
source .venv/bin/activate
export ANTHROPIC_API_KEY=sk-ant-...
python scripts/pittsburgh_traffic_simulator.py
```

### Generate Data for All 50 Sensors

```bash
python scripts/pittsburgh_traffic_simulator.py --sensors 50
```

### Preview Mode (No File Saving)

```bash
python scripts/pittsburgh_traffic_simulator.py --sensors 10 --no-save
```

## Command Line Options

```
--sensors N       Number of sensors to simulate (1-50, default: 5)
--no-save         Don't save CSV files, just display output
```

## Output

### Console Output

The simulator displays a live ticker showing:

```
🚗 PITTSBURGH TRAFFIC MONITORING SYSTEM - CSV DATA GENERATOR 🚗
================================================================================
📍 Monitoring 50 road locations across Pittsburgh
📊 Generating CSV data with traffic metrics
⏱️  Data export interval: 60 seconds
================================================================================

[09:05:23] 🔄 Sensor  1 | I-376_East_Squirrel_Hill        | Generating firmware...
[09:05:28] ✅ Sensor  1 | I-376_East_Squirrel_Hill        | ✓ CSV data ready (5.2s)

📈 Progress: [████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 10.0% (5/50 complete, 0 failed)

[09:05:30] 🔄 Sensor  2 | I-376_West_Oakland              | Generating firmware...
```

### CSV Files

Files are saved to `output/pittsburgh_traffic/`:

```
output/pittsburgh_traffic/
├── road_sensor_1.csv
├── road_sensor_2.csv
├── road_sensor_3.csv
├── ...
├── road_sensor_50.csv
└── all_sensors_combined.csv
```

### CSV Format

```csv
timestamp,node_id,location,frequency_of_cars_ph,average_speed_kmh,traffic_density_percent,heavy_vehicle_ratio,ambient_temperature,road_surface_temp,congestion_level
1000,road_sensor_1,I-376_East_Squirrel_Hill,1250,85.3,45.2,0.15,22.5,28.3,2
2000,road_sensor_1,I-376_East_Squirrel_Hill,1380,82.1,48.7,0.18,22.6,28.5,2
3000,road_sensor_1,I-376_East_Squirrel_Hill,1520,78.4,52.3,0.21,22.7,28.7,3
```

## Monitored Locations

### Major Highways (7 locations)
- I-376 East (Squirrel Hill)
- I-376 West (Oakland)
- I-279 North (Perry)
- I-279 South (Downtown)
- I-579 (Liberty Bridge)
- US-19 (McKnight Road)
- PA-28 (Highland Park)

### Downtown & Central (8 locations)
- Liberty Ave (Downtown)
- Penn Ave (Strip District)
- Forbes Ave (Oakland)
- Fifth Ave (Uptown)
- Smithfield St (Downtown)
- Grant St (Downtown)
- Boulevard of Allies (Midtown)
- Bigelow Blvd (Oakland)

### East End (8 locations)
- Penn Ave (East Liberty)
- Negley Ave (Highland Park)
- Centre Ave (Shadyside)
- Baum Blvd (Bloomfield)
- Murray Ave (Squirrel Hill)
- Forbes Ave (Squirrel Hill)
- Wilkins Ave (Regent Square)
- Beechwood Blvd (Squirrel Hill)

### North Side (5 locations)
- East Ohio St (North Side)
- Federal St (North Side)
- Brighton Road (Brighton Heights)
- Perry Highway (Perry North)
- Babcock Blvd (Ross)

### South Side & South Hills (8 locations)
- Carson St (South Side)
- East Carson St (South Side Flats)
- Brownsville Rd (Carrick)
- West Liberty Ave (Dormont)
- Banksville Rd (Banksville)
- Saw Mill Run Blvd (South Hills)
- Route 51 (South Hills)
- Castle Shannon Blvd (Mt Lebanon)

### West End (5 locations)
- West Carson St (West End)
- Steuben St (Crafton)
- Noblestown Rd (Sheraden)
- Corliss St (West End)
- Chartiers Ave (Sheraden)

### East Suburbs (5 locations)
- Ardmore Blvd (Forest Hills)
- Frankstown Rd (Penn Hills)
- Saltsburg Rd (Penn Hills)
- Braddock Ave (Braddock)
- Greensburg Pike (Forest Hills)

### Additional Key Routes (4 locations)
- McKnight Rd (North Hills)
- Freeport Rd (Fox Chapel)
- Washington Rd (Mt Lebanon)
- Clairton Blvd (Baldwin)
- Brownsville Rd (Brentwood)

**Total: 50 monitoring locations**

## How It Works

1. **Firmware Generation**: Uses Claude AI to generate embedded C code for each sensor
2. **CSV Integration**: Automatically detects CSV requirements and injects appropriate code
3. **QEMU Simulation**: Runs firmware in QEMU ARM emulator
4. **Data Extraction**: Captures CSV output from simulation
5. **File Export**: Saves individual and combined CSV files

## Technical Details

### Board Configuration
- **Board**: LM3S6965 (ARM Cortex-M3)
- **Simulator**: QEMU
- **CSV Method**: Serial/UART output
- **Data Interval**: 60 seconds

### CSV Detection
The system automatically detects CSV requirements from the node description and generates appropriate firmware code with:
- Circular buffer for memory efficiency
- Timestamp tracking
- Multi-field data structure
- Serial output formatting

### Memory Usage
Each sensor uses approximately:
- **Code**: ~5-10KB
- **CSV Buffer**: ~5KB (100 rows × 52 bytes)
- **Total**: ~10-15KB per sensor

## Example Output

```
================================================================================
📊 GENERATION COMPLETE - PROCESSING RESULTS
================================================================================

💾 Saved: road_sensor_1.csv
💾 Saved: road_sensor_2.csv
💾 Saved: road_sensor_3.csv

────────────────────────────────────────────────────────────────────────────────
📊 CSV Data Preview - road_sensor_1
────────────────────────────────────────────────────────────────────────────────
  timestamp,node_id,location,frequency_of_cars_ph,average_speed_kmh,...
  1000,road_sensor_1,I-376_East_Squirrel_Hill,1250,85.3,45.2,0.15,22.5,28.3,2
  2000,road_sensor_1,I-376_East_Squirrel_Hill,1380,82.1,48.7,0.18,22.6,28.5,2
  3000,road_sensor_1,I-376_East_Squirrel_Hill,1520,78.4,52.3,0.21,22.7,28.7,3
  ... (97 more rows)
────────────────────────────────────────────────────────────────────────────────

================================================================================
📈 FINAL SUMMARY
================================================================================
✅ Successful: 5/5 sensors
❌ Failed: 0/5 sensors
⏱️  Total time: 45.3s
📁 CSV files saved to: output/pittsburgh_traffic
📊 Total CSV files: 5
================================================================================

📊 Combined CSV created: output/pittsburgh_traffic/all_sensors_combined.csv
   Total rows: 500
```

## Performance

- **Single Sensor**: ~5-10 seconds
- **5 Sensors**: ~45-60 seconds
- **50 Sensors**: ~8-12 minutes

*Times vary based on Claude API response time and system performance*

## Troubleshooting

### ANTHROPIC_API_KEY not set
```bash
export ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Module not found
```bash
source .venv/bin/activate
pip install -r requirements.txt
```

### Slow generation
- Start with fewer sensors: `--sensors 5`
- Use preview mode: `--no-save`

## Use Cases

1. **Traffic Analysis**: Analyze traffic patterns across Pittsburgh
2. **Rush Hour Monitoring**: Identify congestion hotspots
3. **Data Visualization**: Import CSV into visualization tools
4. **Machine Learning**: Train models on traffic data
5. **Urban Planning**: Support infrastructure decisions

## Integration

### Import to Excel/Google Sheets
```bash
# Open combined CSV
open output/pittsburgh_traffic/all_sensors_combined.csv
```

### Python Analysis
```python
import pandas as pd

# Load data
df = pd.read_csv('output/pittsburgh_traffic/all_sensors_combined.csv')

# Analyze
print(df.groupby('location')['average_speed_kmh'].mean())
```

### Visualization
```python
import matplotlib.pyplot as plt

# Plot traffic density by location
df.groupby('location')['traffic_density_percent'].mean().plot(kind='bar')
plt.title('Average Traffic Density by Location')
plt.show()
```

## Related Documentation

- [WOODWIDE_INTEGRATION.md](../WOODWIDE_INTEGRATION.md) - CSV integration guide
- [INTEGRATION.md](../INTEGRATION.md) - API reference
- [README.md](../README.md) - Main project documentation

## Support

For issues or questions:
- Check the main documentation
- Review CSV integration guide
- Verify ANTHROPIC_API_KEY is set
- Start with fewer sensors for testing

---

**Status**: ✅ Production Ready  
**Last Updated**: 2026-01-18
