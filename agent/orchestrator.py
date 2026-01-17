"""Main orchestration loop: Claude generates, compile, simulate, iterate."""

import asyncio
import os
import subprocess
import tempfile
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path

import anthropic

from renode.orchestrator import NodeConfig, RenodeOrchestrator, SimulationConfig

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
MODEL = "claude-sonnet-4-20250514"
MAX_ITERATIONS = 3


class StepStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


@dataclass
class CompilationResult:
    success: bool
    elf_path: Path | None = None
    errors: str | None = None
    warnings: str | None = None


@dataclass
class TestResult:
    passed: bool
    expected: str
    actual: str
    details: str | None = None


@dataclass
class IterationResult:
    iteration: int
    generated_code: str
    compilation: CompilationResult
    simulation_output: dict[str, str] | None = None
    test_results: list[TestResult] = field(default_factory=list)

    @property
    def success(self) -> bool:
        return (
            self.compilation.success
            and all(t.passed for t in self.test_results)
        )


@dataclass
class NodeSpec:
    node_id: str
    description: str
    expected_uart_patterns: list[str] = field(default_factory=list)


@dataclass
class SystemSpec:
    description: str
    nodes: list[NodeSpec]
    communication_protocol: str = "uart"


class GenerationLoop:
    """Orchestrates Claude -> compile -> Renode -> feedback loop."""

    def __init__(
        self,
        work_dir: Path | None = None,
        compiler: str = "arm-none-eabi-gcc",
    ):
        self.client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        self.compiler = compiler
        self._work_dir_obj: tempfile.TemporaryDirectory | None = None
        self._work_dir = work_dir

    @property
    def work_dir(self) -> Path:
        if self._work_dir:
            return self._work_dir
        if self._work_dir_obj is None:
            self._work_dir_obj = tempfile.TemporaryDirectory(prefix="swarm_")
        return Path(self._work_dir_obj.name)

    def generate_firmware(
        self,
        node: NodeSpec,
        previous_error: str | None = None,
    ) -> str:
        """Call Claude to generate firmware C code for a node."""
        system_prompt = """You are an embedded systems expert generating firmware for STM32F4.
Output ONLY valid C code, no markdown fences or explanation.
The code must:
- Initialize USART2 at 115200 baud for output
- Use the STM32F4 HAL or direct register access
- Be self-contained and compilable"""

        user_prompt = f"Generate firmware for: {node.description}"

        if previous_error:
            user_prompt += f"\n\nPrevious attempt failed with:\n{previous_error}\n\nFix the issues."

        response = self.client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )

        return response.content[0].text

    def compile_firmware(self, code: str, node_id: str) -> CompilationResult:
        """Compile C code to ELF for STM32F4."""
        src_path = self.work_dir / f"{node_id}.c"
        elf_path = self.work_dir / f"{node_id}.elf"

        src_path.write_text(code)

        # Minimal linker script for STM32F4
        linker_script = self.work_dir / "stm32f4.ld"
        if not linker_script.exists():
            linker_script.write_text(self._get_linker_script())

        result = subprocess.run(
            [
                self.compiler,
                "-mcpu=cortex-m4",
                "-mthumb",
                "-mfloat-abi=hard",
                "-mfpu=fpv4-sp-d16",
                "-nostartfiles",
                f"-T{linker_script}",
                "-o", str(elf_path),
                str(src_path),
            ],
            capture_output=True,
            text=True,
        )

        if result.returncode == 0:
            return CompilationResult(success=True, elf_path=elf_path, warnings=result.stderr)
        else:
            return CompilationResult(success=False, errors=result.stderr)

    def _get_linker_script(self) -> str:
        return """
MEMORY
{
    FLASH (rx) : ORIGIN = 0x08000000, LENGTH = 1024K
    RAM (rwx) : ORIGIN = 0x20000000, LENGTH = 128K
}

SECTIONS
{
    .text : { *(.text*) } > FLASH
    .rodata : { *(.rodata*) } > FLASH
    .data : { *(.data*) } > RAM AT > FLASH
    .bss : { *(.bss*) } > RAM
}

_estack = ORIGIN(RAM) + LENGTH(RAM);
"""

    def check_uart_output(
        self,
        uart_log: str,
        expected_patterns: list[str],
    ) -> list[TestResult]:
        """Check UART output against expected patterns."""
        results = []
        for pattern in expected_patterns:
            passed = pattern in uart_log
            results.append(TestResult(
                passed=passed,
                expected=pattern,
                actual=uart_log[:500] if not passed else pattern,
                details=None if passed else f"Pattern '{pattern}' not found in output",
            ))
        return results

    async def run_iteration(
        self,
        node: NodeSpec,
        iteration: int,
        previous_error: str | None = None,
    ) -> IterationResult:
        """Run single iteration of generate -> compile -> simulate."""
        code = self.generate_firmware(node, previous_error)
        compilation = self.compile_firmware(code, node.node_id)

        result = IterationResult(
            iteration=iteration,
            generated_code=code,
            compilation=compilation,
        )

        if not compilation.success:
            return result

        # Run in Renode
        with RenodeOrchestrator() as renode:
            sim_config = SimulationConfig(
                session_id=f"{node.node_id}_iter{iteration}",
                nodes=[NodeConfig(
                    node_id=node.node_id,
                    firmware_path=compilation.elf_path,
                )],
            )
            sim_result = await renode.run_for_duration(sim_config, duration_seconds=5.0)
            result.simulation_output = sim_result.uart_logs

        # Check output against expectations
        uart_log = result.simulation_output.get(node.node_id, "")
        result.test_results = self.check_uart_output(uart_log, node.expected_uart_patterns)

        return result

    async def run(
        self,
        spec: SystemSpec,
        on_progress: callable = None,
    ) -> dict[str, list[IterationResult]]:
        """Run full generation loop for all nodes in spec."""
        all_results: dict[str, list[IterationResult]] = {}

        for node in spec.nodes:
            node_results = []
            previous_error = None

            for iteration in range(MAX_ITERATIONS):
                if on_progress:
                    on_progress(node.node_id, iteration, "running")

                result = await self.run_iteration(node, iteration, previous_error)
                node_results.append(result)

                if result.success:
                    if on_progress:
                        on_progress(node.node_id, iteration, "success")
                    break

                # Build error context for next iteration
                if not result.compilation.success:
                    previous_error = f"Compilation error:\n{result.compilation.errors}"
                else:
                    failed_tests = [t for t in result.test_results if not t.passed]
                    previous_error = "Test failures:\n" + "\n".join(
                        f"- Expected: {t.expected}, Got: {t.actual}" for t in failed_tests
                    )

                if on_progress:
                    on_progress(node.node_id, iteration, "failed")

            all_results[node.node_id] = node_results

        return all_results

    def cleanup(self):
        if self._work_dir_obj:
            self._work_dir_obj.cleanup()
