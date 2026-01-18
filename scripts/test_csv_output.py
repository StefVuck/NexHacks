#!/usr/bin/env python3
"""Simple CSV Test - Demonstrates CSV output from QEMU simulator

This creates a minimal firmware that outputs CSV data when running in QEMU,
showing how the Woodwide AI integration works.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from agent import SystemSpec, NodeSpec, TestAssertion, GenerationLoop


async def test_csv_output():
    """Test CSV output from QEMU simulator."""
    
    print("\n" + "="*80)
    print("🧪 CSV OUTPUT TEST - QEMU Simulator")
    print("="*80)
    print("Testing CSV data generation from firmware running in QEMU")
    print("="*80 + "\n")
    
    # Simple spec that should work
    spec = SystemSpec(
        description="CSV output test",
        board_id="lm3s6965",
        nodes=[
            NodeSpec(
                node_id="csv_test",
                description="Output CSV data with timestamp and counter values. Print header 'timestamp,node_id,counter' then print 5 rows of data like '1000,csv_test,1' with incrementing counter.",
                assertions=[
                    TestAssertion(
                        name="has_csv_header",
                        pattern="timestamp,node_id,counter"
                    ),
                    TestAssertion(
                        name="has_data",
                        pattern="csv_test"
                    ),
                ],
            ),
        ],
    )
    
    loop = GenerationLoop()
    
    try:
        print("🚀 Generating firmware...\n")
        results = await loop.run(spec)
        
        print("\n" + "="*80)
        print("📊 RESULTS")
        print("="*80 + "\n")
        
        for node_id, iterations in results.items():
            successful = [it for it in iterations if it.success]
            
            if successful:
                last_success = successful[-1]
                print(f"✅ Success! Generated CSV output from QEMU\n")
                
                if last_success.simulation and last_success.simulation.stdout:
                    output = last_success.simulation.stdout
                    
                    print("─"*80)
                    print("📊 CSV OUTPUT FROM QEMU SIMULATOR")
                    print("─"*80)
                    print(output[:1000])  # Show first 1000 chars
                    print("─"*80)
                    
                    # Save to file
                    output_file = Path(__file__).parent.parent / "output" / "csv_test_output.txt"
                    output_file.parent.mkdir(parents=True, exist_ok=True)
                    output_file.write_text(output)
                    print(f"\n💾 Full output saved to: {output_file}")
                    
                    # Extract CSV lines
                    csv_lines = [line for line in output.split('\n') if ',' in line]
                    if csv_lines:
                        print(f"\n📈 Found {len(csv_lines)} CSV lines")
                        print("\nFirst 10 CSV lines:")
                        for line in csv_lines[:10]:
                            print(f"  {line}")
                else:
                    print("❌ No simulation output")
            else:
                print(f"❌ Failed after {len(iterations)} iterations")
                if iterations:
                    last_iter = iterations[-1]
                    error = last_iter.get_error_context()
                    print(f"\nError:\n{error[:500]}")
        
        print("\n" + "="*80)
        
    finally:
        loop.cleanup()


if __name__ == "__main__":
    asyncio.run(test_csv_output())
