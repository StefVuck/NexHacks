"""Woodwide CSV Service - Backend CSV consolidation

Receives sensor data from microcontrollers and consolidates to CSV files.
This is a more realistic architecture than generating CSV on the microcontroller.

Architecture:
  ESP32 (JSON) → Backend API → Woodwide Service → CSV Files → Stats
"""

import csv
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from collections import defaultdict

from pydantic import BaseModel


class SensorReading(BaseModel):
    """Individual sensor reading from microcontroller."""
    timestamp: int  # milliseconds since boot or unix timestamp
    node_id: str
    location: str
    frequency_of_cars_ph: Optional[int] = None
    average_speed_kmh: Optional[float] = None
    traffic_density_percent: Optional[float] = None
    heavy_vehicle_ratio: Optional[float] = None
    ambient_temperature: Optional[float] = None
    road_surface_temp: Optional[float] = None
    congestion_level: Optional[int] = None


class WoodwideCSVService:
    """Service for consolidating sensor data into CSV files."""
    
    def __init__(self, output_dir: Path):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.data_buffer: Dict[str, List[SensorReading]] = defaultdict(list)
        
    def ingest_reading(self, reading: SensorReading):
        """Ingest a sensor reading from microcontroller."""
        self.data_buffer[reading.node_id].append(reading)
        
    def ingest_batch(self, readings: List[SensorReading]):
        """Ingest multiple readings at once."""
        for reading in readings:
            self.ingest_reading(reading)
    
    def export_to_csv(self, node_id: Optional[str] = None, clear_buffer: bool = False) -> Path:
        """Export buffered data to CSV file.
        
        Args:
            node_id: Export specific node, or None for all nodes
            clear_buffer: Clear buffer after export
            
        Returns:
            Path to created CSV file
        """
        if node_id:
            # Export single node
            csv_file = self.output_dir / f"{node_id}.csv"
            readings = self.data_buffer[node_id]
            
            if readings:
                self._write_csv(csv_file, readings)
                
                if clear_buffer:
                    self.data_buffer[node_id].clear()
                    
            return csv_file
        else:
            # Export all nodes to combined file
            csv_file = self.output_dir / "all_sensors_combined.csv"
            all_readings = []
            
            for node_readings in self.data_buffer.values():
                all_readings.extend(node_readings)
            
            if all_readings:
                # Sort by timestamp
                all_readings.sort(key=lambda r: r.timestamp)
                self._write_csv(csv_file, all_readings)
                
                if clear_buffer:
                    self.data_buffer.clear()
            
            return csv_file
    
    def _write_csv(self, filepath: Path, readings: List[SensorReading]):
        """Write readings to CSV file."""
        if not readings:
            return
        
        # Get all fields from first reading
        fieldnames = readings[0].model_dump().keys()
        
        with filepath.open('w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for reading in readings:
                writer.writerow(reading.model_dump())
    
    def get_stats(self, node_id: Optional[str] = None) -> Dict:
        """Get statistics from buffered data.
        
        Args:
            node_id: Get stats for specific node, or None for all
            
        Returns:
            Dictionary of statistics
        """
        if node_id:
            readings = self.data_buffer[node_id]
        else:
            readings = []
            for node_readings in self.data_buffer.values():
                readings.extend(node_readings)
        
        if not readings:
            return {"count": 0}
        
        # Calculate stats
        stats = {
            "count": len(readings),
            "nodes": len(set(r.node_id for r in readings)),
            "locations": len(set(r.location for r in readings)),
            "time_range": {
                "start": min(r.timestamp for r in readings),
                "end": max(r.timestamp for r in readings),
            }
        }
        
        # Average metrics
        speeds = [r.average_speed_kmh for r in readings if r.average_speed_kmh is not None]
        densities = [r.traffic_density_percent for r in readings if r.traffic_density_percent is not None]
        
        if speeds:
            stats["average_speed_kmh"] = sum(speeds) / len(speeds)
        
        if densities:
            stats["average_density_percent"] = sum(densities) / len(densities)
        
        # Congestion analysis
        congestion_counts = defaultdict(int)
        for r in readings:
            if r.congestion_level is not None:
                congestion_counts[r.congestion_level] += 1
        
        stats["congestion_distribution"] = dict(congestion_counts)
        
        return stats
    
    def get_buffer_size(self) -> int:
        """Get total number of readings in buffer."""
        return sum(len(readings) for readings in self.data_buffer.values())


# Global service instance
_woodwide_service: Optional[WoodwideCSVService] = None


def get_woodwide_service(output_dir: Optional[Path] = None) -> WoodwideCSVService:
    """Get or create the global Woodwide CSV service."""
    global _woodwide_service
    
    if _woodwide_service is None:
        if output_dir is None:
            output_dir = Path(__file__).parent.parent / "output" / "woodwide_csv"
        _woodwide_service = WoodwideCSVService(output_dir)
    
    return _woodwide_service
