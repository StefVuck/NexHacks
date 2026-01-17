"""QEMU-based embedded simulation orchestrator with board-specific constraints."""

from __future__ import annotations

import asyncio
import os
import subprocess
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import TYPE_CHECKING, Callable

if TYPE_CHECKING:
    from agent.boards import BoardConfig

QEMU_PATH = os.getenv("QEMU_PATH", "qemu-system-arm")


class SimulationState(Enum):
    IDLE = "idle"
    STARTING = "starting"
    RUNNING = "running"
    STOPPING = "stopping"
    ERROR = "error"


@dataclass
class MemoryUsage:
    text: int = 0    # code
    data: int = 0    # initialized data
    bss: int = 0     # uninitialized data
    rodata: int = 0  # read-only data

    @property
    def flash_usage(self) -> int:
        return self.text + self.data + self.rodata

    @property
    def ram_usage(self) -> int:
        return self.data + self.bss

    def validate(self, flash_limit: int, ram_limit: int) -> list[str]:
        errors = []
        if self.flash_usage > flash_limit:
            pct = (self.flash_usage / flash_limit) * 100
            errors.append(
                f"Flash overflow: {self.flash_usage:,}B / {flash_limit:,}B ({pct:.0f}%)"
            )
        if self.ram_usage > ram_limit:
            pct = (self.ram_usage / ram_limit) * 100
            errors.append(
                f"RAM overflow: {self.ram_usage:,}B / {ram_limit:,}B ({pct:.0f}%)"
            )
        return errors

    def summary(self, flash_limit: int, ram_limit: int) -> str:
        flash_pct = (self.flash_usage / flash_limit) * 100 if flash_limit else 0
        ram_pct = (self.ram_usage / ram_limit) * 100 if ram_limit else 0
        return (
            f"Flash: {self.flash_usage:,}B / {flash_limit:,}B ({flash_pct:.1f}%) | "
            f"RAM: {self.ram_usage:,}B / {ram_limit:,}B ({ram_pct:.1f}%)"
        )


@dataclass
class NodeConfig:
    node_id: str
    firmware_path: Path
    timeout_seconds: float = 10.0


@dataclass
class SimulationResult:
    success: bool
    stdout: str = ""
    stderr: str = ""
    exit_code: int | None = None
    timeout: bool = False
    memory: MemoryUsage | None = None
    constraint_errors: list[str] = field(default_factory=list)


class QEMUOrchestrator:
    """Manages QEMU simulation with board-specific constraints."""

    def __init__(self, qemu_path: str = QEMU_PATH):
        self.qemu_path = qemu_path
        self.state = SimulationState.IDLE

    def analyze_elf(self, elf_path: Path, size_tool: str = "arm-none-eabi-size") -> MemoryUsage:
        """Extract memory section sizes from ELF."""
        result = subprocess.run(
            [size_tool, "-A", str(elf_path)],
            capture_output=True,
            text=True,
        )

        usage = MemoryUsage()
        if result.returncode != 0:
            return usage

        for line in result.stdout.splitlines():
            parts = line.split()
            if len(parts) >= 2:
                try:
                    size = int(parts[1])
                    section = parts[0]
                    if section == ".text":
                        usage.text = size
                    elif section == ".data":
                        usage.data = size
                    elif section == ".bss":
                        usage.bss = size
                    elif section == ".rodata":
                        usage.rodata = size
                except ValueError:
                    continue
        return usage

    async def run_single(
        self,
        config: NodeConfig,
        board: BoardConfig,
    ) -> SimulationResult:
        """Run single node in QEMU with board-specific settings."""
        from agent.boards import Architecture

        # Check if board supports QEMU
        if not board.qemu_machine:
            return SimulationResult(
                success=False,
                stderr=f"Board '{board.name}' does not support QEMU simulation. "
                       f"Architecture: {board.arch.value}",
            )

        # Determine size tool based on architecture
        if board.arch in (Architecture.ARM_CORTEX_M0, Architecture.ARM_CORTEX_M3,
                          Architecture.ARM_CORTEX_M4, Architecture.ARM_CORTEX_M4F,
                          Architecture.ARM_CORTEX_M7):
            size_tool = "arm-none-eabi-size"
            qemu_bin = "qemu-system-arm"
        elif board.arch == Architecture.AVR:
            size_tool = "avr-size"
            qemu_bin = None  # AVR uses simavr, not QEMU
        else:
            size_tool = "size"
            qemu_bin = "qemu-system-arm"

        if qemu_bin is None:
            return SimulationResult(
                success=False,
                stderr=f"Architecture {board.arch.value} requires a different simulator",
            )

        # Analyze memory usage
        memory = self.analyze_elf(config.firmware_path, size_tool)
        constraint_errors = memory.validate(board.flash_bytes, board.ram_bytes)

        if constraint_errors:
            return SimulationResult(
                success=False,
                constraint_errors=constraint_errors,
                memory=memory,
            )

        self.state = SimulationState.RUNNING

        try:
            cmd = [
                qemu_bin,
                "-machine", board.qemu_machine,
                "-nographic",
                "-semihosting-config", "enable=on,target=native",
                "-kernel", str(config.firmware_path),
            ]

            if board.qemu_cpu:
                cmd.extend(["-cpu", board.qemu_cpu])

            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=config.timeout_seconds,
                )

                # Semihosting outputs to stderr, use it as program output
                return SimulationResult(
                    success=True,  # If we got here, simulation ran
                    stdout=stderr.decode(),  # Semihosting output
                    stderr="",
                    exit_code=proc.returncode,
                    memory=memory,
                )

            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                # Semihosting outputs to stderr, not stdout
                stderr = await proc.stderr.read() if proc.stderr else b""

                return SimulationResult(
                    success=True,  # Timeout is expected for embedded loops
                    stdout=stderr.decode(),  # Use stderr as program output
                    timeout=True,
                    memory=memory,
                )

        except FileNotFoundError:
            return SimulationResult(
                success=False,
                stderr=f"QEMU not found: {qemu_bin}. Install with: brew install qemu",
            )
        except Exception as e:
            return SimulationResult(
                success=False,
                stderr=str(e),
            )
        finally:
            self.state = SimulationState.IDLE

    async def run_swarm(
        self,
        nodes: list[NodeConfig],
        board: BoardConfig,
        on_output: Callable[[str, str], None] | None = None,
    ) -> dict[str, SimulationResult]:
        """Run multiple nodes concurrently on same board type."""
        tasks = {
            node.node_id: self.run_single(node, board)
            for node in nodes
        }

        results = {}
        for node_id, task in tasks.items():
            results[node_id] = await task
            if on_output:
                on_output(node_id, results[node_id].stdout)

        return results
