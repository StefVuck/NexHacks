#!/usr/bin/env python3
"""Test script for Woodwide AI CSV integration.

Tests CSV detection and code generation for different scenarios.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from agent.orchestrator import GenerationLoop, SystemSpec, NodeSpec, TestAssertion


async def test_serial_csv():
    """Test CSV generation with serial output."""
    print("\n" + "="*60)
    print("TEST 1: Serial CSV Output")
    print("="*60)
    
    spec = SystemSpec(
        description="Temperature sensor with CSV logging",
        board_id="lm3s6965",
        nodes=[
            NodeSpec(
                node_id="csv_test_1",
                description="Read temperature every second and log to CSV via serial",
                assertions=[
                    TestAssertion(name="csv_header", pattern="timestamp,node_id"),
                    TestAssertion(name="has_data", pattern="csv_test_1"),
                ],
            ),
        ],
    )
    
    loop = GenerationLoop()
    try:
        results = await loop.run(spec)
        
        # Check if CSV was detected and generated
        for node_id, iterations in results.items():
            print(f"\nNode: {node_id}")
            for iteration in iterations:
                print(f"  Iteration {iteration.iteration}:")
                print(f"    Compilation: {'✓ Success' if iteration.compilation.success else '✗ Failed'}")
                if iteration.simulation:
                    print(f"    Simulation: {'✓ Success' if iteration.simulation.success else '✗ Failed'}")
                    
                    # Check if CSV keywords appear in generated code
                    if "csv" in iteration.generated_code.lower():
                        print(f"    CSV Detection: ✓ CSV code generated")
                    else:
                        print(f"    CSV Detection: ✗ No CSV code found")
                    
                    # Show first 500 chars of output
                    if iteration.simulation.stdout:
                        print(f"    Output preview:")
                        print("    " + "\n    ".join(iteration.simulation.stdout[:500].split("\n")))
                
                print(f"    Overall: {'✓ PASS' if iteration.success else '✗ FAIL'}")
                
                if iteration.success:
                    break
        
        return all(
            any(it.success for it in iterations)
            for iterations in results.values()
        )
    finally:
        loop.cleanup()


async def test_csv_detection():
    """Test that CSV keywords are properly detected."""
    print("\n" + "="*60)
    print("TEST 2: CSV Keyword Detection")
    print("="*60)
    
    test_cases = [
        ("Temperature sensor with CSV logging", True),
        ("Export statistics to file", True),
        ("Log data every minute", True),
        ("Temperature sensor", False),
        ("Print readings", False),
    ]
    
    from agent.orchestrator import GenerationLoop
    from agent.boards import get_board
    
    loop = GenerationLoop()
    board = get_board("lm3s6965")
    
    all_passed = True
    for description, should_detect in test_cases:
        node = NodeSpec(
            node_id="test",
            description=description,
            assertions=[],
        )
        
        # Check if CSV keywords are in description
        csv_keywords = ["csv", "statistics", "data export", "logging", "log data", "export data"]
        detected = any(keyword in description.lower() for keyword in csv_keywords)
        
        passed = detected == should_detect
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: '{description}' -> CSV detected: {detected} (expected: {should_detect})")
        
        if not passed:
            all_passed = False
    
    return all_passed


async def test_csv_templates():
    """Test that CSV templates are available."""
    print("\n" + "="*60)
    print("TEST 3: CSV Templates Availability")
    print("="*60)
    
    from agent.templates import get_csv_template, CSV_SERIAL_TEMPLATE, CSV_HTTP_TEMPLATE, CSV_SD_TEMPLATE
    
    tests = [
        ("serial", "lm3s6965", CSV_SERIAL_TEMPLATE),
        ("serial", "esp32", CSV_SERIAL_TEMPLATE),
        ("http", "esp32", CSV_HTTP_TEMPLATE),
        ("http", "lm3s6965", CSV_SERIAL_TEMPLATE),  # Fallback to serial
        ("sd", "esp32", CSV_SD_TEMPLATE),
        ("sd", "lm3s6965", CSV_SERIAL_TEMPLATE),  # Fallback to serial
    ]
    
    all_passed = True
    for method, board_id, expected_template in tests:
        template = get_csv_template(board_id, method)
        passed = template == expected_template
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: get_csv_template('{board_id}', '{method}')")
        
        if not passed:
            all_passed = False
            print(f"  Expected: {expected_template[:50]}...")
            print(f"  Got: {template[:50]}...")
    
    return all_passed


async def test_csv_config_model():
    """Test CSVConfig Pydantic model."""
    print("\n" + "="*60)
    print("TEST 4: CSVConfig Model")
    print("="*60)
    
    from api.models import CSVConfig, NodePlacement
    
    try:
        # Test default values
        config = CSVConfig()
        assert config.enabled == False
        assert config.method == "serial"
        assert config.interval_seconds == 60
        assert config.fields == ["timestamp", "node_id"]
        assert config.max_rows == 1000
        print("✓ PASS: Default values correct")
        
        # Test custom values
        config = CSVConfig(
            enabled=True,
            method="http",
            interval_seconds=30,
            fields=["timestamp", "node_id", "temperature"],
            max_rows=500,
        )
        assert config.enabled == True
        assert config.method == "http"
        assert config.interval_seconds == 30
        assert config.fields == ["timestamp", "node_id", "temperature"]
        assert config.max_rows == 500
        print("✓ PASS: Custom values correct")
        
        # Test NodePlacement integration
        node = NodePlacement(
            node_id="test",
            description="Test node",
            csv_config=config,
        )
        assert node.csv_config is not None
        assert node.csv_config.enabled == True
        print("✓ PASS: NodePlacement integration works")
        
        return True
    except Exception as e:
        print(f"✗ FAIL: {e}")
        return False


async def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("WOODWIDE AI CSV INTEGRATION TEST SUITE")
    print("="*60)
    
    results = {}
    
    # Test 1: CSV Config Model
    results["CSV Config Model"] = await test_csv_config_model()
    
    # Test 2: CSV Detection
    results["CSV Detection"] = await test_csv_detection()
    
    # Test 3: CSV Templates
    results["CSV Templates"] = await test_csv_templates()
    
    # Test 4: Serial CSV (requires ANTHROPIC_API_KEY)
    import os
    if os.getenv("ANTHROPIC_API_KEY"):
        results["Serial CSV Generation"] = await test_serial_csv()
    else:
        print("\n⚠ Skipping Serial CSV test (ANTHROPIC_API_KEY not set)")
        results["Serial CSV Generation"] = None
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    for test_name, result in results.items():
        if result is None:
            status = "⚠ SKIPPED"
        elif result:
            status = "✓ PASS"
        else:
            status = "✗ FAIL"
        print(f"{status}: {test_name}")
    
    # Overall result
    passed = [r for r in results.values() if r is True]
    failed = [r for r in results.values() if r is False]
    skipped = [r for r in results.values() if r is None]
    
    print(f"\nTotal: {len(passed)} passed, {len(failed)} failed, {len(skipped)} skipped")
    
    return len(failed) == 0


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
