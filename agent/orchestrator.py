"""Main orchestration loop: Claude generates, compile, simulate, iterate."""

import asyncio
import os
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

import anthropic

from agent.boards import BoardConfig, Architecture, DEFAULT_BOARD, get_board
from simulator.orchestrator import (
    MemoryUsage,
    NodeConfig,
    QEMUOrchestrator,
    SimulationResult,
)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
MODEL = "claude-sonnet-4-20250514"
MAX_ITERATIONS = 3


def get_constraints_prompt(board: BoardConfig) -> str:
    return f"""
CRITICAL HARDWARE CONSTRAINTS for {board.name}:
1. Flash limit: {board.flash_kb}KB ({board.flash_bytes:,} bytes) - code + constants must fit
2. RAM limit: {board.ram_kb}KB ({board.ram_bytes:,} bytes) - all variables must fit
3. CPU: {board.arch.value} @ {board.clock_mhz}MHz
4. NO standard library (no stdio.h, stdlib.h, string.h) - bare metal only
5. Must use ARM semihosting for output (SYS_WRITE0 = 0x04)
6. Must have valid vector table at 0x0 with stack pointer and reset handler
7. No dynamic memory allocation (no malloc/free)
{"8. Hardware FPU available - can use float/double" if board.has_fpu else "8. NO FPU - avoid floating point, use fixed-point math"}
"""


def get_startup_code(board: BoardConfig) -> str:
    """Generate architecture-specific startup code."""
    stack_top = f"0x{0x20000000 + board.ram_bytes:08X}"

    return f'''
// Minimal startup for {board.arch.value} with semihosting
// Board: {board.name}

// Forward declarations
void Reset_Handler(void);
void Default_Handler(void);
int main(void);

// Vector table
__attribute__((section(".vectors")))
const void *vectors[] = {{
    (void *){stack_top},   // Initial SP
    Reset_Handler,         // Reset
    Default_Handler,       // NMI
    Default_Handler,       // HardFault
    Default_Handler,       // MemManage
    Default_Handler,       // BusFault
    Default_Handler,       // UsageFault
    0, 0, 0, 0,           // Reserved
    Default_Handler,       // SVCall
    Default_Handler,       // Debug
    0,                     // Reserved
    Default_Handler,       // PendSV
    Default_Handler,       // SysTick
}};

void Default_Handler(void) {{ while(1); }}

// Semihosting: print null-terminated string
static void sh_write0(const char *s) {{
    register const char *r1 __asm__("r1") = s;
    register int r0 __asm__("r0") = 0x04;  // SYS_WRITE0
    __asm__ volatile (
        "bkpt #0xAB"
        : : "r"(r0), "r"(r1) : "memory"
    );
}}

// Semihosting: exit program (may not work on all QEMU machines)
__attribute__((unused))
static void sh_exit(int code) {{
    volatile unsigned int block[2] = {{ 0x20026, (unsigned int)code }};
    register unsigned int *r1 __asm__("r1") = (unsigned int *)block;
    register int r0 __asm__("r0") = 0x18;
    __asm__ volatile ("bkpt #0xAB" : : "r"(r0), "r"(r1) : "memory");
}}

// Integer to string helper
__attribute__((unused))
static void int_to_str(int val, char *buf) {{
    if (val == 0) {{ buf[0] = '0'; buf[1] = '\\0'; return; }}
    int neg = val < 0;
    if (neg) val = -val;
    char tmp[12];
    int i = 0;
    while (val > 0) {{ tmp[i++] = '0' + (val % 10); val /= 10; }}
    int j = 0;
    if (neg) buf[j++] = '-';
    while (i > 0) buf[j++] = tmp[--i];
    buf[j] = '\\0';
}}

void Reset_Handler(void) {{
    main();
    while(1);  // Loop forever, rely on timeout
}}
'''


@dataclass
class CompilationResult:
    success: bool
    elf_path: Path | None = None
    errors: str | None = None
    warnings: str | None = None
    memory: MemoryUsage | None = None


@dataclass
class TestAssertion:
    name: str
    pattern: str
    required: bool = True


@dataclass
class TestResult:
    passed: bool
    assertion: TestAssertion
    actual_output: str
    details: str | None = None


@dataclass
class IterationResult:
    iteration: int
    generated_code: str
    compilation: CompilationResult
    simulation: SimulationResult | None = None
    test_results: list[TestResult] = field(default_factory=list)

    @property
    def success(self) -> bool:
        if not self.compilation.success:
            return False
        if self.simulation and not self.simulation.success:
            return False
        if self.simulation and self.simulation.constraint_errors:
            return False
        return all(t.passed for t in self.test_results if t.assertion.required)

    def get_error_context(self) -> str:
        """Build error context for Claude retry."""
        errors = []

        if not self.compilation.success:
            errors.append(f"COMPILATION FAILED:\n{self.compilation.errors}")

        if self.simulation:
            if self.simulation.constraint_errors:
                errors.append("MEMORY CONSTRAINT VIOLATIONS:\n" + "\n".join(
                    f"  - {e}" for e in self.simulation.constraint_errors
                ))
            if self.simulation.stderr:
                errors.append(f"RUNTIME ERRORS:\n{self.simulation.stderr}")

        failed_tests = [t for t in self.test_results if not t.passed]
        if failed_tests:
            errors.append("TEST FAILURES:\n" + "\n".join(
                f"  - {t.assertion.name}: expected '{t.assertion.pattern}' in output"
                for t in failed_tests
            ))
            if self.simulation:
                errors.append(f"ACTUAL OUTPUT:\n{self.simulation.stdout[:1000]}")

        return "\n\n".join(errors)


@dataclass
class NodeSpec:
    node_id: str
    description: str
    assertions: list[TestAssertion] = field(default_factory=list)


@dataclass
class SystemSpec:
    description: str
    nodes: list[NodeSpec]
    board_id: str = "lm3s6965"  # Default to best QEMU support

    @property
    def board(self) -> BoardConfig:
        return get_board(self.board_id)


class GenerationLoop:
    """Orchestrates Claude -> compile -> QEMU simulate -> feedback loop."""

    def __init__(
        self,
        work_dir: Path | None = None,
    ):
        self.client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        self.qemu = QEMUOrchestrator()
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
        board: BoardConfig,
        previous_error: str | None = None,
    ) -> str:
        """Call Claude to generate firmware C code for a node."""
        constraints = get_constraints_prompt(board)

        system_prompt = f"""You are an embedded systems expert generating bare-metal firmware.

{constraints}

The startup code with vector table and semihosting helpers is PROVIDED - do not redefine them.
You have access to:
  - sh_write0(const char*) - print null-terminated string
  - int_to_str(int val, char *buf) - convert int to string

DO NOT call sh_exit() - just return from main() when done.

Output ONLY the main() function and any helper functions you need.
No #includes. No startup code. No vector table.
Code must be valid C that compiles with {board.compiler} -nostdlib."""

        user_prompt = f"""Generate bare-metal firmware for: {node.description}

Target board: {board.name}
Architecture: {board.arch.value}
Available memory: {board.flash_kb}KB Flash, {board.ram_kb}KB RAM

Required output patterns (must appear in semihosting output):
{chr(10).join(f'  - "{a.pattern}"' for a in node.assertions)}

Write ONLY the main() function and helpers. Startup code is already provided."""

        if previous_error:
            user_prompt += f"\n\nPREVIOUS ATTEMPT FAILED:\n{previous_error}\n\nFix all issues."

        response = self.client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )

        generated = response.content[0].text

        # Strip markdown fences if present
        if "```" in generated:
            lines = generated.split("\n")
            in_code = False
            code_lines = []
            for line in lines:
                if line.startswith("```"):
                    in_code = not in_code
                elif in_code:
                    code_lines.append(line)
            generated = "\n".join(code_lines)

        startup = get_startup_code(board)
        return startup + "\n\n// Generated code:\n" + generated

    def compile_firmware(self, code: str, node_id: str, board: BoardConfig) -> CompilationResult:
        """Compile C code to ELF for target board."""
        src_path = self.work_dir / f"{node_id}.c"
        elf_path = self.work_dir / f"{node_id}.elf"

        src_path.write_text(code)

        linker_script = self.work_dir / f"{board.id}.ld"
        if not linker_script.exists():
            linker_script.write_text(self._get_linker_script(board))

        cmd = [
            board.compiler,
            *board.compiler_flags,
            "-nostdlib",
            "-nostartfiles",
            "-ffreestanding",
            "-Os",
            "-Wall",
            "-Werror",
            f"-T{linker_script}",
            "-o", str(elf_path),
            str(src_path),
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode == 0:
            memory = self.qemu.analyze_elf(elf_path)
            return CompilationResult(
                success=True,
                elf_path=elf_path,
                warnings=result.stderr if result.stderr else None,
                memory=memory,
            )
        else:
            return CompilationResult(success=False, errors=result.stderr)

    def _get_linker_script(self, board: BoardConfig) -> str:
        return f"""
MEMORY
{{
    FLASH (rx)  : ORIGIN = 0x00000000, LENGTH = {board.flash_kb}K
    RAM (rwx)   : ORIGIN = 0x20000000, LENGTH = {board.ram_kb}K
}}

SECTIONS
{{
    .vectors : {{ *(.vectors) }} > FLASH
    .text : {{ *(.text*) }} > FLASH
    .rodata : {{ *(.rodata*) }} > FLASH
    .data : {{ *(.data*) }} > RAM AT > FLASH
    .bss : {{ *(.bss*) }} > RAM
}}
"""

    def check_output(
        self,
        output: str,
        assertions: list[TestAssertion],
    ) -> list[TestResult]:
        """Check simulation output against expected patterns."""
        results = []
        for assertion in assertions:
            passed = assertion.pattern in output
            results.append(TestResult(
                passed=passed,
                assertion=assertion,
                actual_output=output[:500],
                details=None if passed else f"Pattern '{assertion.pattern}' not found",
            ))
        return results

    async def run_iteration(
        self,
        node: NodeSpec,
        board: BoardConfig,
        iteration: int,
        previous_error: str | None = None,
    ) -> IterationResult:
        """Run single iteration of generate -> compile -> simulate."""
        code = self.generate_firmware(node, board, previous_error)
        compilation = self.compile_firmware(code, node.node_id, board)

        result = IterationResult(
            iteration=iteration,
            generated_code=code,
            compilation=compilation,
        )

        if not compilation.success:
            return result

        # Run in QEMU
        sim_config = NodeConfig(
            node_id=node.node_id,
            firmware_path=compilation.elf_path,
            timeout_seconds=5.0,
        )
        result.simulation = await self.qemu.run_single(sim_config, board)

        # Check output against assertions
        if result.simulation.success or result.simulation.timeout:
            result.test_results = self.check_output(
                result.simulation.stdout,
                node.assertions,
            )

        return result

    async def run(
        self,
        spec: SystemSpec,
        on_progress: callable = None,
    ) -> dict[str, list[IterationResult]]:
        """Run full generation loop for all nodes in spec."""
        board = spec.board
        all_results: dict[str, list[IterationResult]] = {}

        for node in spec.nodes:
            node_results = []
            previous_error = None

            for iteration in range(MAX_ITERATIONS):
                if on_progress:
                    on_progress(node.node_id, iteration, "running")

                result = await self.run_iteration(node, board, iteration, previous_error)
                node_results.append(result)

                if result.success:
                    if on_progress:
                        on_progress(node.node_id, iteration, "success")
                    break

                previous_error = result.get_error_context()

                if on_progress:
                    on_progress(node.node_id, iteration, "failed")

            all_results[node.node_id] = node_results

        return all_results

    def cleanup(self):
        if self._work_dir_obj:
            self._work_dir_obj.cleanup()
