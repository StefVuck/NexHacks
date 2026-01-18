#!/usr/bin/env python3
"""Pittsburgh Traffic Simulator - Backend CSV Architecture

Simulates ESP32 sensors sending data to backend API, which consolidates to CSV.

Architecture:
  ESP32 Sensors → HTTP POST → Backend API → Woodwide Service → CSV Files
  
This is more realistic than generating CSV on the microcontroller.
"""

import asyncio
import httpx
import random
import time
from datetime import datetime
from pathlib import Path

# Pittsburgh road locations
pittsburgh_roads = [
    "I-376_East_Squirrel_Hill", "I-376_West_Oakland", "I-279_North_Perry", "I-279_South_Downtown",
    "I-579_Liberty_Bridge", "US-19_McKnight_Road", "PA-28_Highland_Park",
    "Liberty_Ave_Downtown", "Penn_Ave_Strip_District", "Forbes_Ave_Oakland",
]


def generate_sensor_reading(sensor_id: str, location: str, iteration: int):
    """Generate a realistic sensor reading."""
    # Simulate rush hour pattern
    if 30 <= iteration < 60:
        # Peak traffic
        cars_ph = random.randint(2000, 2800)
        speed = random.uniform(45, 65)
        density = random.uniform(70, 90)
        congestion = random.choice([3, 4])
    elif 20 <= iteration < 30 or 60 <= iteration < 70:
        # Building/easing traffic
        cars_ph = random.randint(1400, 2000)
        speed = random.uniform(65, 85)
        density = random.uniform(50, 70)
        congestion = 2
    else:
        # Normal traffic
        cars_ph = random.randint(800, 1400)
        speed = random.uniform(85, 105)
        density = random.uniform(25, 50)
        congestion = random.choice([0, 1])
    
    # Other metrics
    heavy_ratio = random.uniform(0.10, 0.28)
    ambient_temp = random.uniform(20, 25)
    surface_temp = ambient_temp + random.uniform(5, 12)
    
    return {
        "timestamp": int(time.time() * 1000),  # Current time in ms
        "node_id": sensor_id,
        "location": location,
        "frequency_of_cars_ph": int(cars_ph),
        "average_speed_kmh": round(speed, 1),
        "traffic_density_percent": round(density, 1),
        "heavy_vehicle_ratio": round(heavy_ratio, 2),
        "ambient_temperature": round(ambient_temp, 1),
        "road_surface_temp": round(surface_temp, 1),
        "congestion_level": congestion
    }


async def simulate_sensor(sensor_id: str, location: str, num_readings: int, backend_url: str):
    """Simulate a single sensor sending data to backend."""
    async with httpx.AsyncClient() as client:
        for i in range(num_readings):
            reading = generate_sensor_reading(sensor_id, location, i)
            
            try:
                response = await client.post(
                    f"{backend_url}/api/woodwide/ingest",
                    json=reading,
                    timeout=5.0
                )
                
                if response.status_code == 200:
                    timestamp = datetime.now().strftime("%H:%M:%S")
                    print(f"[{timestamp}] ✅ {sensor_id:>15} | {location:<35} | Reading {i+1:>3}/{num_readings} sent")
                else:
                    print(f"❌ {sensor_id} | Failed: {response.status_code}")
                    
            except Exception as e:
                print(f"❌ {sensor_id} | Error: {e}")
            
            # Small delay between readings
            await asyncio.sleep(0.1)


async def main():
    """Main simulator."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Pittsburgh Traffic Simulator - Backend Architecture")
    parser.add_argument("--sensors", type=int, default=5, help="Number of sensors (1-50)")
    parser.add_argument("--readings", type=int, default=10, help="Readings per sensor")
    parser.add_argument("--backend", default="http://localhost:8000", help="Backend URL")
    
    args = parser.parse_args()
    
    num_sensors = min(args.sensors, len(pittsburgh_roads))
    
    print("\n" + "="*80)
    print("🚗 PITTSBURGH TRAFFIC SIMULATOR - BACKEND CSV ARCHITECTURE")
    print("="*80)
    print(f"📍 Simulating {num_sensors} sensors")
    print(f"📊 {args.readings} readings per sensor")
    print(f"🌐 Backend: {args.backend}")
    print("="*80 + "\n")
    
    print("Architecture:")
    print("  ESP32 Sensors → HTTP POST → Backend API → Woodwide Service → CSV")
    print()
    
    # Check backend health
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{args.backend}/health", timeout=5.0)
            if response.status_code == 200:
                print("✅ Backend is healthy\n")
            else:
                print("⚠️  Backend health check failed\n")
    except Exception as e:
        print(f"❌ Cannot connect to backend: {e}")
        print(f"   Make sure backend is running: uvicorn api.main:app --reload\n")
        return
    
    print("🚀 Starting sensor simulation...\n")
    
    # Run all sensors concurrently
    tasks = []
    for i, road in enumerate(pittsburgh_roads[:num_sensors], 1):
        sensor_id = f"road_sensor_{i}"
        task = simulate_sensor(sensor_id, road, args.readings, args.backend)
        tasks.append(task)
    
    await asyncio.gather(*tasks)
    
    print("\n" + "="*80)
    print("📊 SIMULATION COMPLETE")
    print("="*80)
    
    # Get stats from backend
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{args.backend}/api/woodwide/stats", timeout=5.0)
            if response.status_code == 200:
                stats = response.json()
                print(f"\n📈 Backend Statistics:")
                print(f"   Total readings: {stats.get('count', 0)}")
                print(f"   Sensors: {stats.get('nodes', 0)}")
                print(f"   Locations: {stats.get('locations', 0)}")
                if 'average_speed_kmh' in stats:
                    print(f"   Avg speed: {stats['average_speed_kmh']:.1f} km/h")
                if 'average_density_percent' in stats:
                    print(f"   Avg density: {stats['average_density_percent']:.1f}%")
    except Exception as e:
        print(f"   Could not fetch stats: {e}")
    
    # Export to CSV
    print(f"\n📊 Exporting to CSV...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{args.backend}/api/woodwide/export/csv",
                timeout=10.0
            )
            if response.status_code == 200:
                result = response.json()
                print(f"   ✅ CSV exported: {result['csv_file']}")
                print(f"\n📥 Download CSV:")
                print(f"   {args.backend}/api/woodwide/download/csv/all_sensors_combined.csv")
            else:
                print(f"   ❌ Export failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Export error: {e}")
    
    print("\n" + "="*80)
    print("✨ Data available via backend API!")
    print("="*80 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
