"""Renode simulation orchestrator - manages lifecycle and communication."""

import asyncio
import os
import subprocess
import tempfile
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Callable

RENODE_PATH = os.getenv("RENODE_PATH", "renode")
TEMPLATES_DIR = Path(__file__).parent / "templates"


class SimulationState(Enum):
    IDLE = "idle"
    STARTING = "starting"
    RUNNING = "running"
    STOPPING = "stopping"
    ERROR = "error"


@dataclass
class NodeConfig:
    node_id: str
    firmware_path: Path
    uart_log_path: Path | None = None


@dataclass
class SimulationConfig:
    session_id: str
    nodes: list[NodeConfig]
    platform: str = "stm32f4"
    work_dir: Path | None = None


@dataclass
class SimulationResult:
    success: bool
    uart_logs: dict[str, str] = field(default_factory=dict)
    error: str | None = None
    exit_code: int | None = None


class RenodeOrchestrator:
    """Manages Renode process lifecycle and UART capture."""

    def __init__(self, renode_path: str = RENODE_PATH):
        self.renode_path = renode_path
        self.process: subprocess.Popen | None = None
        self.state = SimulationState.IDLE
        self.config: SimulationConfig | None = None
        self._work_dir: tempfile.TemporaryDirectory | None = None
        self._on_output: Callable[[str], None] | None = None

    @property
    def work_dir(self) -> Path:
        if self._work_dir is None:
            self._work_dir = tempfile.TemporaryDirectory(prefix="renode_")
        return Path(self._work_dir.name)

    def generate_resc(self, config: SimulationConfig) -> Path:
        """Generate .resc script for the simulation."""
        resc_path = self.work_dir / f"{config.session_id}.resc"

        lines = [
            f"# Auto-generated Renode script for session {config.session_id}",
            "",
            "using sysbus",
            "",
        ]

        for i, node in enumerate(config.nodes):
            machine_name = f"machine_{node.node_id}"
            uart_log = node.uart_log_path or (self.work_dir / f"{node.node_id}_uart.log")
            node.uart_log_path = uart_log

            lines.extend([
                f"# Node: {node.node_id}",
                f"mach create \"{machine_name}\"",
                f"machine LoadPlatformDescription @{TEMPLATES_DIR}/{config.platform}.repl",
                f"sysbus LoadELF @{node.firmware_path}",
                f"showAnalyzer sysbus.usart2",
                f"sysbus.usart2 CreateFileBackend @{uart_log}",
                "",
            ])

        lines.extend([
            "# Start all machines",
            "start",
        ])

        resc_path.write_text("\n".join(lines))
        return resc_path

    async def start(
        self,
        config: SimulationConfig,
        timeout_seconds: float = 30.0,
        on_output: Callable[[str], None] | None = None,
    ) -> None:
        """Start Renode simulation."""
        if self.state == SimulationState.RUNNING:
            raise RuntimeError("Simulation already running")

        self.config = config
        self._on_output = on_output
        self.state = SimulationState.STARTING

        resc_path = self.generate_resc(config)

        try:
            self.process = subprocess.Popen(
                [
                    self.renode_path,
                    "--disable-xwt",  # headless mode
                    "--console",
                    str(resc_path),
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
            )
            self.state = SimulationState.RUNNING

            if on_output:
                asyncio.create_task(self._stream_output())

        except FileNotFoundError:
            self.state = SimulationState.ERROR
            raise RuntimeError(f"Renode not found at: {self.renode_path}")
        except Exception as e:
            self.state = SimulationState.ERROR
            raise RuntimeError(f"Failed to start Renode: {e}")

    async def _stream_output(self) -> None:
        """Stream Renode stdout to callback."""
        if not self.process or not self.process.stdout:
            return

        loop = asyncio.get_event_loop()
        while self.process.poll() is None:
            line = await loop.run_in_executor(None, self.process.stdout.readline)
            if line and self._on_output:
                self._on_output(line.rstrip())

    async def stop(self, timeout_seconds: float = 10.0) -> SimulationResult:
        """Stop simulation and collect results."""
        if self.state != SimulationState.RUNNING or not self.process:
            return SimulationResult(success=False, error="No simulation running")

        self.state = SimulationState.STOPPING

        try:
            self.process.terminate()
            try:
                self.process.wait(timeout=timeout_seconds)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()

            uart_logs = self._collect_uart_logs()

            self.state = SimulationState.IDLE
            return SimulationResult(
                success=True,
                uart_logs=uart_logs,
                exit_code=self.process.returncode,
            )

        except Exception as e:
            self.state = SimulationState.ERROR
            return SimulationResult(success=False, error=str(e))
        finally:
            self.process = None

    def _collect_uart_logs(self) -> dict[str, str]:
        """Read UART log files for all nodes."""
        logs = {}
        if not self.config:
            return logs

        for node in self.config.nodes:
            if node.uart_log_path and node.uart_log_path.exists():
                logs[node.node_id] = node.uart_log_path.read_text()
        return logs

    async def run_for_duration(
        self,
        config: SimulationConfig,
        duration_seconds: float,
        on_output: Callable[[str], None] | None = None,
    ) -> SimulationResult:
        """Run simulation for specified duration then stop."""
        await self.start(config, on_output=on_output)
        await asyncio.sleep(duration_seconds)
        return await self.stop()

    def cleanup(self) -> None:
        """Clean up temporary files."""
        if self._work_dir:
            self._work_dir.cleanup()
            self._work_dir = None

    def __enter__(self):
        return self

    def __exit__(self, *args):
        if self.state == SimulationState.RUNNING:
            asyncio.get_event_loop().run_until_complete(self.stop())
        self.cleanup()
