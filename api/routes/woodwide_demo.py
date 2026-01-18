"""Woodwide Demo Data Generator - Simple endpoint to generate mock traffic data"""

import asyncio
import random
import time
from datetime import datetime
from fastapi import APIRouter, BackgroundTasks
from api.woodwide_service import get_woodwide_service, SensorReading

router = APIRouter(prefix="/api/woodwide/demo", tags=["woodwide-demo"])

# Track running demo tasks
_demo_task = None
_demo_running = False


@router.post("/start")
async def start_demo_data_generation(background_tasks: BackgroundTasks):
    """Start generating mock traffic sensor data for demo purposes.

    This continuously generates realistic traffic data without needing
    the full build/simulation pipeline.
    """
    global _demo_task, _demo_running

    if _demo_running:
        return {"status": "already_running", "message": "Demo data generation already active"}

    _demo_running = True

    async def generate_demo_data():
        """Background task to generate mock traffic data"""
        global _demo_running

        woodwide = get_woodwide_service()
        sensor_count = 5
        iteration = 0

        try:
            while _demo_running:
                iteration += 1

                # Generate data for each sensor
                for sensor_id in range(1, sensor_count + 1):
                    # Simulate time-of-day traffic patterns
                    hour = datetime.now().hour

                    # Peak traffic during rush hours (7-9am, 5-7pm)
                    is_rush_hour = (7 <= hour <= 9) or (17 <= hour <= 19)

                    # Base values depend on time of day
                    if is_rush_hour:
                        base_speed = 25
                        base_density = 70
                        base_frequency = 300
                        congestion_weights = [0.1, 0.2, 0.4, 0.3]  # More likely to be congested
                    else:
                        base_speed = 50
                        base_density = 30
                        base_frequency = 150
                        congestion_weights = [0.5, 0.3, 0.15, 0.05]  # Less likely to be congested

                    # Add some randomness
                    speed = round(base_speed + random.gauss(0, 10), 1)
                    speed = max(10, min(80, speed))  # Clamp between 10-80 km/h

                    density = round(base_density + random.gauss(0, 15), 1)
                    density = max(0, min(100, density))  # Clamp between 0-100%

                    frequency = int(base_frequency + random.gauss(0, 50))
                    frequency = max(0, frequency)

                    # Congestion level based on density and speed
                    congestion = random.choices([0, 1, 2, 3], weights=congestion_weights)[0]

                    # Generate reading
                    reading = SensorReading(
                        timestamp=int(time.time() * 1000),
                        node_id=f"traffic_sensor_{sensor_id}",
                        location=f"intersection_{chr(64 + sensor_id)}",  # A, B, C, D, E
                        frequency_of_cars_ph=frequency,
                        average_speed_kmh=speed,
                        traffic_density_percent=density,
                        heavy_vehicle_ratio=round(random.uniform(0.05, 0.25), 2),
                        ambient_temperature=round(random.uniform(15, 30), 1),
                        road_surface_temp=round(random.uniform(18, 35), 1),
                        congestion_level=congestion,
                    )

                    woodwide.ingest_reading(reading)

                # Wait 2 seconds between batches
                await asyncio.sleep(2)

        except asyncio.CancelledError:
            pass
        finally:
            _demo_running = False

    # Start the background task
    _demo_task = asyncio.create_task(generate_demo_data())

    return {
        "status": "started",
        "message": "Demo data generation started",
        "sensors": 5,
        "interval_seconds": 2
    }


@router.post("/stop")
async def stop_demo_data_generation():
    """Stop generating demo data."""
    global _demo_task, _demo_running

    if not _demo_running:
        return {"status": "not_running", "message": "Demo data generation not active"}

    _demo_running = False

    if _demo_task and not _demo_task.done():
        _demo_task.cancel()
        try:
            await _demo_task
        except asyncio.CancelledError:
            pass

    return {"status": "stopped", "message": "Demo data generation stopped"}


@router.get("/status")
async def get_demo_status():
    """Get demo data generation status."""
    global _demo_running

    woodwide = get_woodwide_service()

    return {
        "running": _demo_running,
        "buffer_size": woodwide.get_buffer_size(),
        "nodes": list(woodwide.data_buffer.keys()),
    }
