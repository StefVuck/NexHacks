#!/usr/bin/env python3
"""Pittsburgh Traffic Monitoring System - CSV Data Generator

Simulates 50 road sensors across Pittsburgh generating real-time traffic data
with CSV export. Includes a live ticker showing data generation progress.
"""

import asyncio
import sys
import time
from datetime import datetime
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from agent import SystemSpec, NodeSpec, TestAssertion

# Pittsburgh road locations - mix of highways, main roads, and local streets
pittsburgh_roads = [
    # Major highways
    "I-376_East_Squirrel_Hill", "I-376_West_Oakland", "I-279_North_Perry", "I-279_South_Downtown",
    "I-579_Liberty_Bridge", "US-19_McKnight_Road", "PA-28_Highland_Park",
    
    # Downtown & Central
    "Liberty_Ave_Downtown", "Penn_Ave_Strip_District", "Forbes_Ave_Oakland", 
    "Fifth_Ave_Uptown", "Smithfield_St_Downtown", "Grant_St_Downtown",
    "Boulevard_of_Allies_Midtown", "Bigelow_Blvd_Oakland",
    
    # East End
    "Penn_Ave_East_Liberty", "Negley_Ave_Highland_Park", "Centre_Ave_Shadyside",
    "Baum_Blvd_Bloomfield", "Murray_Ave_Squirrel_Hill", "Forbes_Ave_Squirrel_Hill",
    "Wilkins_Ave_Regent_Square", "Beechwood_Blvd_Squirrel_Hill",
    
    # North Side
    "East_Ohio_St_North_Side", "Federal_St_North_Side", "Brighton_Road_Brighton_Heights",
    "Perry_Highway_Perry_North", "Babcock_Blvd_Ross",
    
    # South Side & South Hills
    "Carson_St_South_Side", "East_Carson_St_South_Side_Flats", "Brownsville_Rd_Carrick",
    "West_Liberty_Ave_Dormont", "Banksville_Rd_Banksville", "Saw_Mill_Run_Blvd_South_Hills",
    "Route_51_South_Hills", "Castle_Shannon_Blvd_Mt_Lebanon",
    
    # West End
    "West_Carson_St_West_End", "Steuben_St_Crafton", "Noblestown_Rd_Sheraden",
    "Corliss_St_West_End", "Chartiers_Ave_Sheraden",
    
    # East Suburbs
    "Ardmore_Blvd_Forest_Hills", "Frankstown_Rd_Penn_Hills", "Saltsburg_Rd_Penn_Hills",
    "Braddock_Ave_Braddock", "Greensburg_Pike_Forest_Hills",
    
    # Additional key routes
    "McKnight_Rd_North_Hills", "Freeport_Rd_Fox_Chapel", "Washington_Rd_Mt_Lebanon",
    "Clairton_Blvd_Baldwin", "Brownsville_Rd_Brentwood"
]


def print_banner():
    """Print startup banner."""
    print("\n" + "="*80)
    print("🚗 PITTSBURGH TRAFFIC MONITORING SYSTEM - CSV DATA GENERATOR 🚗")
    print("="*80)
    print(f"📍 Monitoring {len(pittsburgh_roads)} road locations across Pittsburgh")
    print("📊 Generating CSV data with traffic metrics")
    print("⏱️  Data export interval: 60 seconds")
    print("="*80 + "\n")


def print_ticker(node_id: str, iteration: int, status: str, elapsed: float = 0):
    """Print live ticker showing generation progress."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    
    if status == "running":
        symbol = "🔄"
        color = "\033[93m"  # Yellow
    elif status == "success":
        symbol = "✅"
        color = "\033[92m"  # Green
    else:
        symbol = "❌"
        color = "\033[91m"  # Red
    
    reset = "\033[0m"
    
    # Extract road name from node_id
    sensor_num = node_id.replace("road_sensor_", "")
    road_idx = int(sensor_num) - 1
    road_name = pittsburgh_roads[road_idx] if road_idx < len(pittsburgh_roads) else "Unknown"
    
    if status == "running":
        print(f"{color}[{timestamp}] {symbol} Sensor {sensor_num:>2} | {road_name:<35} | Generating firmware...{reset}")
    elif status == "success":
        print(f"{color}[{timestamp}] {symbol} Sensor {sensor_num:>2} | {road_name:<35} | ✓ CSV data ready ({elapsed:.1f}s){reset}")
    else:
        print(f"{color}[{timestamp}] {symbol} Sensor {sensor_num:>2} | {road_name:<35} | ✗ Failed (iteration {iteration}){reset}")


def print_csv_preview(node_id: str, simulation_output: str):
    """Extract and print CSV data from simulation output."""
    lines = simulation_output.split('\n')
    csv_lines = [line for line in lines if ',' in line and 'timestamp' in line.lower() or 
                 ('road_sensor' in line and ',' in line)]
    
    if csv_lines:
        print("\n" + "─"*80)
        print(f"📊 CSV Data Preview - {node_id}")
        print("─"*80)
        for line in csv_lines[:5]:  # Show first 5 lines
            print(f"  {line}")
        if len(csv_lines) > 5:
            print(f"  ... ({len(csv_lines) - 5} more rows)")
        print("─"*80 + "\n")


async def generate_traffic_data(max_sensors: int = 50, save_csv: bool = True):
    """Generate traffic data for Pittsburgh road sensors.
    
    Args:
        max_sensors: Maximum number of sensors to simulate (1-50)
        save_csv: Whether to save CSV output to files
    """
    print_banner()
    
    # Limit to available roads
    num_sensors = min(max_sensors, len(pittsburgh_roads))
    
    print(f"🎯 Generating firmware for {num_sensors} sensors...")
    print(f"💾 CSV output will be {'saved to files' if save_csv else 'displayed only'}")
    print("\n" + "="*80 + "\n")
    
    # Create specification
    spec = SystemSpec(
        description=f"Pittsburgh road traffic monitoring system with CSV data generation for {num_sensors} sensors",
        board_id="lm3s6965",  # Use QEMU-compatible board for faster simulation
        nodes=[
            NodeSpec(
                node_id=f"road_sensor_{i+1}",
                description=f"Traffic sensor at {road} generating CSV with frequency_of_cars_ph (50-3000), average_speed_kmh (15-110), traffic_density_percent (5-95), heavy_vehicle_ratio (0.05-0.30), ambient_temperature (-10 to 40C), road_surface_temp (ambient+5-15C), congestion_level (0-4). Data exported every 60 seconds with realistic rush hour patterns.",
                assertions=[
                    TestAssertion(
                        name="csv_header",
                        pattern="timestamp,node_id"
                    ),
                    TestAssertion(
                        name="has_data",
                        pattern=f"road_sensor_{i+1}"
                    ),
                ],
            )
            for i, road in enumerate(pittsburgh_roads[:num_sensors])
        ],
    )
    
    # Import GenerationLoop
    from agent import GenerationLoop
    
    # Create output directory
    output_dir = Path(__file__).parent.parent / "output" / "pittsburgh_traffic"
    if save_csv:
        output_dir.mkdir(parents=True, exist_ok=True)
        print(f"📁 Output directory: {output_dir}\n")
    
    # Progress tracking
    total_sensors = len(spec.nodes)
    completed = 0
    failed = 0
    start_time = time.time()
    
    # Progress callback
    def on_progress(node_id: str, iteration: int, status: str):
        nonlocal completed, failed
        
        elapsed = time.time() - start_time
        
        if status == "success":
            completed += 1
            print_ticker(node_id, iteration, status, elapsed)
            
            # Print progress bar
            progress = (completed + failed) / total_sensors * 100
            bar_length = 40
            filled = int(bar_length * (completed + failed) / total_sensors)
            bar = "█" * filled + "░" * (bar_length - filled)
            print(f"\n📈 Progress: [{bar}] {progress:.1f}% ({completed}/{total_sensors} complete, {failed} failed)\n")
            
        elif status == "failed":
            failed += 1
            print_ticker(node_id, iteration, status)
        else:
            print_ticker(node_id, iteration, status)
    
    # Run generation loop
    loop = GenerationLoop()
    
    try:
        print("🚀 Starting firmware generation...\n")
        results = await loop.run(spec, on_progress=on_progress)
        
        # Process results
        print("\n" + "="*80)
        print("📊 GENERATION COMPLETE - PROCESSING RESULTS")
        print("="*80 + "\n")
        
        csv_data = {}
        
        for node_id, iterations in results.items():
            # Get successful iteration
            successful = [it for it in iterations if it.success]
            
            if successful:
                last_success = successful[-1]
                
                # Extract CSV from simulation output
                if last_success.simulation and last_success.simulation.stdout:
                    csv_data[node_id] = last_success.simulation.stdout
                    
                    # Save to file if requested
                    if save_csv:
                        csv_file = output_dir / f"{node_id}.csv"
                        csv_file.write_text(last_success.simulation.stdout)
                        print(f"💾 Saved: {csv_file.name}")
                    
                    # Show preview for first few sensors
                    if len(csv_data) <= 3:
                        print_csv_preview(node_id, last_success.simulation.stdout)
        
        # Summary
        print("\n" + "="*80)
        print("📈 FINAL SUMMARY")
        print("="*80)
        print(f"✅ Successful: {completed}/{total_sensors} sensors")
        print(f"❌ Failed: {failed}/{total_sensors} sensors")
        print(f"⏱️  Total time: {time.time() - start_time:.1f}s")
        
        if save_csv:
            print(f"📁 CSV files saved to: {output_dir}")
            print(f"📊 Total CSV files: {len(csv_data)}")
        
        print("="*80 + "\n")
        
        # Create combined CSV
        if save_csv and csv_data:
            combined_file = output_dir / "all_sensors_combined.csv"
            with combined_file.open('w') as f:
                # Write header from first sensor
                first_data = list(csv_data.values())[0]
                header_line = [line for line in first_data.split('\n') if 'timestamp' in line.lower()]
                if header_line:
                    f.write(header_line[0] + '\n')
                
                # Write all data
                for node_id, data in csv_data.items():
                    lines = data.split('\n')
                    data_lines = [line for line in lines if line and 'timestamp' not in line.lower()]
                    for line in data_lines:
                        if line.strip():
                            f.write(line + '\n')
            
            print(f"📊 Combined CSV created: {combined_file}")
            # Calculate total rows separately to avoid f-string backslash issue
            total_rows = sum(len([l for l in d.split('\n') if l.strip()]) for d in csv_data.values())
            print(f"   Total rows: {total_rows}")
        
        return csv_data
        
    finally:
        loop.cleanup()


async def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Pittsburgh Traffic Monitoring System - CSV Data Generator"
    )
    parser.add_argument(
        "--sensors",
        type=int,
        default=5,
        help="Number of sensors to simulate (1-50, default: 5)"
    )
    parser.add_argument(
        "--no-save",
        action="store_true",
        help="Don't save CSV files, just display output"
    )
    
    args = parser.parse_args()
    
    # Validate sensor count
    num_sensors = max(1, min(args.sensors, len(pittsburgh_roads)))
    
    if args.sensors != num_sensors:
        print(f"⚠️  Adjusted sensor count to {num_sensors} (max available)")
    
    # Run simulation
    await generate_traffic_data(
        max_sensors=num_sensors,
        save_csv=not args.no_save
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
