#!/usr/bin/env python3
"""Quick test of the generation loop - run with: python scripts/test_loop.py"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from agent.orchestrator import GenerationLoop, NodeSpec, SystemSpec


def on_progress(node_id: str, iteration: int, status: str):
    print(f"[{node_id}] Iteration {iteration}: {status}")


async def main():
    spec = SystemSpec(
        description="Simple temperature sensor node",
        nodes=[
            NodeSpec(
                node_id="temp_sensor_1",
                description="Temperature sensor that reads value and prints to UART every second",
                expected_uart_patterns=["temp="],
            ),
        ],
    )

    loop = GenerationLoop()

    try:
        print("Starting generation loop...")
        results = await loop.run(spec, on_progress=on_progress)

        for node_id, iterations in results.items():
            print(f"\n=== {node_id} ===")
            for result in iterations:
                print(f"Iteration {result.iteration}:")
                print(f"  Compiled: {result.compilation.success}")
                if result.compilation.errors:
                    print(f"  Errors: {result.compilation.errors[:200]}...")
                if result.test_results:
                    for t in result.test_results:
                        print(f"  Test '{t.expected}': {'PASS' if t.passed else 'FAIL'}")
    finally:
        loop.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
