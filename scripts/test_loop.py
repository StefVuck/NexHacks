#!/usr/bin/env python3
"""Test the generation loop - run with: python scripts/test_loop.py"""

import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

# Load .env file
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

# Check for API key
if not os.getenv("ANTHROPIC_API_KEY"):
    print("ERROR: ANTHROPIC_API_KEY not found in .env or environment")
    sys.exit(1)

from agent import (
    GenerationLoop,
    NodeSpec,
    SystemSpec,
    TestAssertion,
    BOARDS,
    QEMU_SUPPORTED_BOARDS,
    list_boards_table,
)


def on_progress(node_id: str, iteration: int, status: str):
    print(f"[{node_id}] Iteration {iteration}: {status}")


def print_boards():
    print("\nAvailable boards:")
    print(list_boards_table())
    print(f"\nQEMU-supported boards: {[b.id for b in QEMU_SUPPORTED_BOARDS]}")


async def main():
    # Show available boards
    print_boards()

    # Pick a board - lm3s6965 has best QEMU semihosting support
    board_id = "lm3s6965"  # 256KB Flash, 64KB RAM

    print(f"\n{'='*60}")
    print(f"Testing with: {BOARDS[board_id].name}")
    print(f"Constraints: {BOARDS[board_id].flash_kb}KB Flash, {BOARDS[board_id].ram_kb}KB RAM")
    print(f"{'='*60}\n")

    spec = SystemSpec(
        description="Simple counter node",
        board_id=board_id,
        nodes=[
            NodeSpec(
                node_id="counter",
                description="Count from 1 to 5, printing each number, then exit",
                assertions=[
                    TestAssertion(name="has_count_1", pattern="1"),
                    TestAssertion(name="has_count_5", pattern="5"),
                ],
            ),
        ],
    )

    loop = GenerationLoop()

    try:
        print("Starting generation loop...")
        print(f"Work dir: {loop.work_dir}\n")
        results = await loop.run(spec, on_progress=on_progress)

        for node_id, iterations in results.items():
            print(f"\n{'='*60}")
            print(f"Node: {node_id}")
            print(f"{'='*60}")

            for result in iterations:
                print(f"\nIteration {result.iteration}:")
                print(f"  Compiled: {result.compilation.success}")

                if result.compilation.memory:
                    m = result.compilation.memory
                    board = spec.board
                    print(f"  {m.summary(board.flash_bytes, board.ram_bytes)}")

                if result.compilation.errors:
                    print(f"  Compile errors:\n{result.compilation.errors[:500]}")

                if result.simulation:
                    sim = result.simulation
                    print(f"  Simulation: success={sim.success}, timeout={sim.timeout}")
                    if sim.stdout:
                        print(f"  Output: {sim.stdout[:300]}")
                    if sim.constraint_errors:
                        for err in sim.constraint_errors:
                            print(f"  CONSTRAINT ERROR: {err}")
                    if sim.stderr:
                        print(f"  Stderr: {sim.stderr[:200]}")

                if result.test_results:
                    for t in result.test_results:
                        status = "PASS" if t.passed else "FAIL"
                        print(f"  Test '{t.assertion.name}': {status}")

                print(f"  Overall success: {result.success}")

                if result.success:
                    print("\n  Generated code:")
                    print("  " + "-"*40)
                    code = result.generated_code
                    if "// Generated code:" in code:
                        generated_part = code.split("// Generated code:")[1]
                        for line in generated_part.strip().split("\n")[:30]:
                            print(f"  {line}")
                    print("  " + "-"*40)

    finally:
        loop.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
