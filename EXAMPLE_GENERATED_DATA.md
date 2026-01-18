# Example Generated CSV Data from Pittsburgh Traffic Monitoring System

## Live Ticker Output Example

```
================================================================================
🚗 PITTSBURGH TRAFFIC MONITORING SYSTEM - CSV DATA GENERATOR 🚗
================================================================================
📍 Monitoring 51 road locations across Pittsburgh
📊 Generating CSV data with traffic metrics
⏱️  Data export interval: 60 seconds
================================================================================

🎯 Generating firmware for 3 sensors...
💾 CSV output will be saved to files

================================================================================

📁 Output directory: /Users/manu/Developer/NexHacks/output/pittsburgh_traffic

🚀 Starting firmware generation...

[09:10:53] 🔄 Sensor  1 | I-376_East_Squirrel_Hill        | Generating firmware...
[09:10:58] ✅ Sensor  1 | I-376_East_Squirrel_Hill        | ✓ CSV data ready (5.2s)

📈 Progress: [█████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░] 33.3% (1/3 complete, 0 failed)

[09:11:00] 🔄 Sensor  2 | I-376_West_Oakland              | Generating firmware...
[09:11:06] ✅ Sensor  2 | I-376_West_Oakland              | ✓ CSV data ready (11.3s)

📈 Progress: [██████████████████████████░░░░░░░░░░░░░░] 66.7% (2/3 complete, 0 failed)

[09:11:08] 🔄 Sensor  3 | I-279_North_Perry               | Generating firmware...
[09:11:13] ✅ Sensor  3 | I-279_North_Perry               | ✓ CSV data ready (16.8s)

📈 Progress: [████████████████████████████████████████] 100.0% (3/3 complete, 0 failed)
```

## CSV Data Preview

```
────────────────────────────────────────────────────────────────────────────────
📊 CSV Data Preview - road_sensor_1
────────────────────────────────────────────────────────────────────────────────
  timestamp,node_id,location,frequency_of_cars_ph,average_speed_kmh,traffic_density_percent,heavy_vehicle_ratio,ambient_temperature,road_surface_temp,congestion_level
  1000,road_sensor_1,I-376_East_Squirrel_Hill,1250,85.3,45.2,0.15,22.5,28.3,2
  2000,road_sensor_1,I-376_East_Squirrel_Hill,1380,82.1,48.7,0.18,22.6,28.5,2
  3000,road_sensor_1,I-376_East_Squirrel_Hill,1520,78.4,52.3,0.21,22.7,28.7,3
  4000,road_sensor_1,I-376_East_Squirrel_Hill,1650,75.2,55.8,0.23,22.8,28.9,3
  ... (96 more rows)
────────────────────────────────────────────────────────────────────────────────
```

## Individual Sensor CSV File

**File**: `output/pittsburgh_traffic/road_sensor_1.csv`

```csv
timestamp,node_id,location,frequency_of_cars_ph,average_speed_kmh,traffic_density_percent,heavy_vehicle_ratio,ambient_temperature,road_surface_temp,congestion_level
1000,road_sensor_1,I-376_East_Squirrel_Hill,1250,85.3,45.2,0.15,22.5,28.3,2
2000,road_sensor_1,I-376_East_Squirrel_Hill,1380,82.1,48.7,0.18,22.6,28.5,2
3000,road_sensor_1,I-376_East_Squirrel_Hill,1520,78.4,52.3,0.21,22.7,28.7,3
4000,road_sensor_1,I-376_East_Squirrel_Hill,1650,75.2,55.8,0.23,22.8,28.9,3
5000,road_sensor_1,I-376_East_Squirrel_Hill,1780,72.8,58.9,0.25,22.9,29.1,3
6000,road_sensor_1,I-376_East_Squirrel_Hill,1920,69.5,62.3,0.27,23.0,29.3,3
7000,road_sensor_1,I-376_East_Squirrel_Hill,2050,66.1,65.7,0.28,23.1,29.5,4
8000,road_sensor_1,I-376_East_Squirrel_Hill,2180,62.8,68.9,0.29,23.2,29.7,4
9000,road_sensor_1,I-376_East_Squirrel_Hill,2280,59.4,71.5,0.30,23.3,29.9,4
10000,road_sensor_1,I-376_East_Squirrel_Hill,2350,56.2,73.8,0.29,23.4,30.1,4
11000,road_sensor_1,I-376_East_Squirrel_Hill,2420,53.1,75.9,0.28,23.5,30.3,4
12000,road_sensor_1,I-376_East_Squirrel_Hill,2480,50.3,77.6,0.27,23.6,30.5,4
13000,road_sensor_1,I-376_East_Squirrel_Hill,2520,47.8,79.1,0.26,23.7,30.7,4
14000,road_sensor_1,I-376_East_Squirrel_Hill,2450,51.2,76.8,0.25,23.6,30.5,4
15000,road_sensor_1,I-376_East_Squirrel_Hill,2380,54.5,74.3,0.24,23.5,30.3,4
16000,road_sensor_1,I-376_East_Squirrel_Hill,2290,58.1,71.5,0.23,23.4,30.1,3
17000,road_sensor_1,I-376_East_Squirrel_Hill,2180,61.8,68.4,0.22,23.3,29.9,3
18000,road_sensor_1,I-376_East_Squirrel_Hill,2050,65.7,65.1,0.21,23.2,29.7,3
19000,road_sensor_1,I-376_East_Squirrel_Hill,1920,69.8,61.5,0.20,23.1,29.5,3
20000,road_sensor_1,I-376_East_Squirrel_Hill,1780,73.9,57.8,0.19,23.0,29.3,2
21000,road_sensor_1,I-376_East_Squirrel_Hill,1650,78.2,54.2,0.18,22.9,29.1,2
22000,road_sensor_1,I-376_East_Squirrel_Hill,1520,82.5,50.5,0.17,22.8,28.9,2
23000,road_sensor_1,I-376_East_Squirrel_Hill,1380,86.9,46.8,0.16,22.7,28.7,2
24000,road_sensor_1,I-376_East_Squirrel_Hill,1250,91.3,43.2,0.15,22.6,28.5,1
25000,road_sensor_1,I-376_East_Squirrel_Hill,1120,95.8,39.5,0.14,22.5,28.3,1
```

## Multiple Sensors Combined

**File**: `output/pittsburgh_traffic/all_sensors_combined.csv`

```csv
timestamp,node_id,location,frequency_of_cars_ph,average_speed_kmh,traffic_density_percent,heavy_vehicle_ratio,ambient_temperature,road_surface_temp,congestion_level
1000,road_sensor_1,I-376_East_Squirrel_Hill,1250,85.3,45.2,0.15,22.5,28.3,2
2000,road_sensor_1,I-376_East_Squirrel_Hill,1380,82.1,48.7,0.18,22.6,28.5,2
3000,road_sensor_1,I-376_East_Squirrel_Hill,1520,78.4,52.3,0.21,22.7,28.7,3
1000,road_sensor_2,I-376_West_Oakland,2150,62.5,68.3,0.22,21.8,27.5,3
2000,road_sensor_2,I-376_West_Oakland,2280,59.8,71.2,0.24,21.9,27.7,4
3000,road_sensor_2,I-376_West_Oakland,2420,56.4,74.5,0.26,22.0,27.9,4
1000,road_sensor_3,I-279_North_Perry,890,98.5,28.7,0.12,23.2,29.8,1
2000,road_sensor_3,I-279_North_Perry,1020,95.2,32.4,0.13,23.3,30.0,1
3000,road_sensor_3,I-279_North_Perry,1150,91.8,36.1,0.14,23.4,30.2,1
```

## Data Characteristics

### Rush Hour Pattern (I-376 East - Morning)
- **6:00 AM**: Low traffic (800 cars/h, 105 km/h, 25% density, level 0)
- **7:00 AM**: Building (1500 cars/h, 85 km/h, 48% density, level 2)
- **8:00 AM**: Peak (2500 cars/h, 55 km/h, 78% density, level 4)
- **9:00 AM**: Easing (1800 cars/h, 72 km/h, 58% density, level 3)
- **10:00 AM**: Normal (1200 cars/h, 90 km/h, 42% density, level 1)

### Highway vs Downtown Comparison

**I-376 East (Highway)**:
```csv
timestamp,node_id,location,frequency_of_cars_ph,average_speed_kmh,traffic_density_percent,heavy_vehicle_ratio,ambient_temperature,road_surface_temp,congestion_level
8000,road_sensor_1,I-376_East_Squirrel_Hill,2500,55.2,78.5,0.28,23.5,30.2,4
```

**Liberty Ave Downtown**:
```csv
timestamp,node_id,location,frequency_of_cars_ph,average_speed_kmh,traffic_density_percent,heavy_vehicle_ratio,ambient_temperature,road_surface_temp,congestion_level
8000,road_sensor_8,Liberty_Ave_Downtown,1850,35.8,82.3,0.18,24.2,31.5,4
```

### Temperature Correlation
Notice how road surface temperature is always 5-15°C higher than ambient:
- Ambient: 22.5°C → Surface: 28.3°C (difference: 5.8°C)
- Ambient: 23.5°C → Surface: 30.2°C (difference: 6.7°C)

### Heavy Vehicle Patterns
- **Highways** (I-376, I-279): 0.15-0.30 ratio (15-30% trucks)
- **Downtown**: 0.08-0.18 ratio (8-18% trucks)
- **Residential**: 0.05-0.12 ratio (5-12% trucks)

## Final Summary

```
================================================================================
📈 FINAL SUMMARY
================================================================================
✅ Successful: 3/3 sensors
❌ Failed: 0/3 sensors
⏱️  Total time: 16.8s
📁 CSV files saved to: output/pittsburgh_traffic
📊 Total CSV files: 3
================================================================================

📊 Combined CSV created: output/pittsburgh_traffic/all_sensors_combined.csv
   Total rows: 75
```

## Data Analysis Example

### Python Analysis

```python
import pandas as pd

# Load the data
df = pd.read_csv('output/pittsburgh_traffic/all_sensors_combined.csv')

# Summary statistics
print(df.describe())

# Average speed by location
speed_by_location = df.groupby('location')['average_speed_kmh'].mean().sort_values()
print("\nAverage Speed by Location:")
print(speed_by_location)

# Congestion hotspots (level 3 or 4)
congested = df[df['congestion_level'] >= 3]
print(f"\nCongestion Events: {len(congested)}")
print(congested.groupby('location').size().sort_values(ascending=False))

# Rush hour detection (high frequency + low speed)
rush_hour = df[(df['frequency_of_cars_ph'] > 2000) & (df['average_speed_kmh'] < 60)]
print(f"\nRush Hour Conditions: {len(rush_hour)} readings")
```

### Expected Output

```
Average Speed by Location:
Liberty_Ave_Downtown              35.8
I-376_West_Oakland               59.1
I-376_East_Squirrel_Hill         72.3
I-279_North_Perry                95.2

Congestion Events: 45

Congestion by Location:
I-376_East_Squirrel_Hill    18
I-376_West_Oakland          15
Liberty_Ave_Downtown        12

Rush Hour Conditions: 23 readings
```

## Data Quality Features

✅ **Realistic Values**: All metrics within specified ranges  
✅ **Temporal Patterns**: Rush hour simulation with gradual changes  
✅ **Correlations**: Speed inversely correlated with density  
✅ **Temperature Dynamics**: Road surface warmer than ambient  
✅ **Location Variance**: Different patterns for highways vs downtown  
✅ **Timestamp Consistency**: Regular 1-second intervals  

---

**Note**: This is example data showing what the system generates. To create actual data, run:

```bash
export ANTHROPIC_API_KEY=sk-ant-your-key-here
python scripts/pittsburgh_traffic_simulator.py --sensors 3
```
