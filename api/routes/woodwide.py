"""Woodwide API Routes - CSV consolidation endpoints

Endpoints for receiving sensor data and exporting CSV files.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from typing import List, Optional
from pathlib import Path

from api.woodwide_service import (
    SensorReading,
    get_woodwide_service,
)

router = APIRouter(prefix="/api/woodwide", tags=["woodwide"])


@router.post("/ingest")
async def ingest_sensor_data(reading: SensorReading):
    """Ingest a single sensor reading.
    
    Microcontrollers POST their data here.
    """
    service = get_woodwide_service()
    service.ingest_reading(reading)
    
    return {
        "status": "ok",
        "node_id": reading.node_id,
        "buffer_size": service.get_buffer_size()
    }


@router.post("/ingest/batch")
async def ingest_sensor_batch(readings: List[SensorReading]):
    """Ingest multiple sensor readings at once."""
    service = get_woodwide_service()
    service.ingest_batch(readings)
    
    return {
        "status": "ok",
        "count": len(readings),
        "buffer_size": service.get_buffer_size()
    }


@router.post("/export/csv")
async def export_csv(node_id: Optional[str] = None, clear_buffer: bool = False):
    """Export buffered data to CSV file.
    
    Args:
        node_id: Export specific node, or omit for all nodes
        clear_buffer: Clear buffer after export
    """
    service = get_woodwide_service()
    csv_file = service.export_to_csv(node_id=node_id, clear_buffer=clear_buffer)
    
    return {
        "status": "ok",
        "csv_file": str(csv_file),
        "buffer_size": service.get_buffer_size()
    }


@router.get("/download/csv/{filename}")
async def download_csv(filename: str):
    """Download a CSV file.
    
    Args:
        filename: Name of CSV file (e.g., 'road_sensor_1.csv' or 'all_sensors_combined.csv')
    """
    service = get_woodwide_service()
    csv_file = service.output_dir / filename
    
    if not csv_file.exists():
        raise HTTPException(status_code=404, detail="CSV file not found")
    
    return FileResponse(
        path=csv_file,
        media_type="text/csv",
        filename=filename
    )


@router.get("/stats")
async def get_stats(node_id: Optional[str] = None):
    """Get statistics from buffered sensor data.
    
    Args:
        node_id: Get stats for specific node, or omit for all nodes
    """
    service = get_woodwide_service()
    stats = service.get_stats(node_id=node_id)
    
    return stats


@router.get("/status")
async def get_status():
    """Get Woodwide service status."""
    service = get_woodwide_service()
    
    return {
        "status": "running",
        "buffer_size": service.get_buffer_size(),
        "nodes": list(service.data_buffer.keys()),
        "output_dir": str(service.output_dir)
    }


@router.delete("/clear")
async def clear_buffer(node_id: Optional[str] = None):
    """Clear buffered data.
    
    Args:
        node_id: Clear specific node, or omit to clear all
    """
    service = get_woodwide_service()
    
    if node_id:
        service.data_buffer[node_id].clear()
    else:
        service.data_buffer.clear()
    
    return {
        "status": "ok",
        "buffer_size": service.get_buffer_size()
    }
