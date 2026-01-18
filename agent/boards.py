"""Board definitions with hardware constraints."""

from dataclasses import dataclass
from enum import Enum


class Architecture(Enum):
    ARM_CORTEX_M0 = "cortex-m0"
    ARM_CORTEX_M3 = "cortex-m3"
    ARM_CORTEX_M4 = "cortex-m4"
    ARM_CORTEX_M4F = "cortex-m4f"
    ARM_CORTEX_M7 = "cortex-m7"
    AVR = "avr"
    XTENSA_LX6 = "xtensa-lx6"
    RISCV32 = "riscv32"


@dataclass(frozen=True)
class BoardConfig:
    id: str
    name: str
    arch: Architecture
    flash_kb: int
    ram_kb: int
    clock_mhz: int
    qemu_machine: str | None  # None if not supported in QEMU
    qemu_cpu: str | None
    compiler: str
    compiler_flags: tuple[str, ...]
    has_fpu: bool = False
    has_wifi: bool = False
    has_bluetooth: bool = False
    notes: str = ""

    @property
    def flash_bytes(self) -> int:
        return self.flash_kb * 1024

    @property
    def ram_bytes(self) -> int:
        return self.ram_kb * 1024


# STM32 Family
STM32F103C8 = BoardConfig(
    id="stm32f103c8",
    name="STM32F103C8 (Blue Pill)",
    arch=Architecture.ARM_CORTEX_M3,
    flash_kb=64,
    ram_kb=20,
    clock_mhz=72,
    qemu_machine="stm32vldiscovery",
    qemu_cpu="cortex-m3",
    compiler="arm-none-eabi-gcc",
    compiler_flags=("-mcpu=cortex-m3", "-mthumb"),
    notes="Popular cheap dev board, limited RAM",
)

STM32F401RE = BoardConfig(
    id="stm32f401re",
    name="STM32F401RE (Nucleo)",
    arch=Architecture.ARM_CORTEX_M4F,
    flash_kb=512,
    ram_kb=96,
    clock_mhz=84,
    qemu_machine="netduinoplus2",
    qemu_cpu="cortex-m4",
    compiler="arm-none-eabi-gcc",
    compiler_flags=("-mcpu=cortex-m4", "-mthumb", "-mfloat-abi=hard", "-mfpu=fpv4-sp-d16"),
    has_fpu=True,
    notes="Good balance of performance and cost",
)

STM32F407VG = BoardConfig(
    id="stm32f407vg",
    name="STM32F407VG (Discovery)",
    arch=Architecture.ARM_CORTEX_M4F,
    flash_kb=1024,
    ram_kb=192,
    clock_mhz=168,
    qemu_machine="netduinoplus2",
    qemu_cpu="cortex-m4",
    compiler="arm-none-eabi-gcc",
    compiler_flags=("-mcpu=cortex-m4", "-mthumb", "-mfloat-abi=hard", "-mfpu=fpv4-sp-d16"),
    has_fpu=True,
    notes="High performance, lots of peripherals",
)

STM32L476RG = BoardConfig(
    id="stm32l476rg",
    name="STM32L476RG (Nucleo)",
    arch=Architecture.ARM_CORTEX_M4F,
    flash_kb=1024,
    ram_kb=128,
    clock_mhz=80,
    qemu_machine="netduinoplus2",
    qemu_cpu="cortex-m4",
    compiler="arm-none-eabi-gcc",
    compiler_flags=("-mcpu=cortex-m4", "-mthumb", "-mfloat-abi=hard", "-mfpu=fpv4-sp-d16"),
    has_fpu=True,
    notes="Ultra low power",
)

# ESP32 Family (limited QEMU support)
ESP32 = BoardConfig(
    id="esp32",
    name="ESP32 (Generic)",
    arch=Architecture.XTENSA_LX6,
    flash_kb=4096,  # External flash, varies
    ram_kb=520,
    clock_mhz=240,
    qemu_machine=None,  # QEMU support is experimental
    qemu_cpu=None,
    compiler="xtensa-esp32-elf-gcc",
    compiler_flags=("-mlongcalls",),
    has_fpu=True,
    has_wifi=True,
    has_bluetooth=True,
    notes="WiFi + BT, dual core, no QEMU - use native sim",
)

ESP32_S3 = BoardConfig(
    id="esp32s3",
    name="ESP32-S3",
    arch=Architecture.XTENSA_LX6,
    flash_kb=8192,
    ram_kb=512,
    clock_mhz=240,
    qemu_machine=None,
    qemu_cpu=None,
    compiler="xtensa-esp32s3-elf-gcc",
    compiler_flags=("-mlongcalls",),
    has_fpu=True,
    has_wifi=True,
    has_bluetooth=True,
    notes="AI acceleration, USB OTG",
)

ESP32_C3 = BoardConfig(
    id="esp32c3",
    name="ESP32-C3",
    arch=Architecture.RISCV32,
    flash_kb=4096,
    ram_kb=400,
    clock_mhz=160,
    qemu_machine=None,  # Partial support exists
    qemu_cpu=None,
    compiler="riscv32-esp-elf-gcc",
    compiler_flags=("-march=rv32imc",),
    has_wifi=True,
    has_bluetooth=True,
    notes="RISC-V based, low cost",
)

# Arduino Family
ARDUINO_UNO = BoardConfig(
    id="arduino_uno",
    name="Arduino Uno (ATmega328P)",
    arch=Architecture.AVR,
    flash_kb=32,
    ram_kb=2,
    clock_mhz=16,
    qemu_machine=None,  # Use simavr instead
    qemu_cpu=None,
    compiler="avr-gcc",
    compiler_flags=("-mmcu=atmega328p",),
    notes="Classic Arduino, very limited resources",
)

ARDUINO_NANO = BoardConfig(
    id="arduino_nano",
    name="Arduino Nano (ATmega328P)",
    arch=Architecture.AVR,
    flash_kb=32,
    ram_kb=2,
    clock_mhz=16,
    qemu_machine=None,
    qemu_cpu=None,
    compiler="avr-gcc",
    compiler_flags=("-mmcu=atmega328p",),
    notes="Compact form factor, same as Uno",
)

ARDUINO_MEGA = BoardConfig(
    id="arduino_mega",
    name="Arduino Mega (ATmega2560)",
    arch=Architecture.AVR,
    flash_kb=256,
    ram_kb=8,
    clock_mhz=16,
    qemu_machine=None,
    qemu_cpu=None,
    compiler="avr-gcc",
    compiler_flags=("-mmcu=atmega2560",),
    notes="More pins and memory than Uno",
)

ARDUINO_DUE = BoardConfig(
    id="arduino_due",
    name="Arduino Due (SAM3X8E)",
    arch=Architecture.ARM_CORTEX_M3,
    flash_kb=512,
    ram_kb=96,
    clock_mhz=84,
    qemu_machine="lm3s6965evb",  # Not exact match but compatible
    qemu_cpu="cortex-m3",
    compiler="arm-none-eabi-gcc",
    compiler_flags=("-mcpu=cortex-m3", "-mthumb"),
    notes="32-bit ARM Arduino",
)

# Generic/Test boards
LM3S6965 = BoardConfig(
    id="lm3s6965",
    name="LM3S6965 (Stellaris)",
    arch=Architecture.ARM_CORTEX_M3,
    flash_kb=256,
    ram_kb=64,
    clock_mhz=50,
    qemu_machine="lm3s6965evb",
    qemu_cpu="cortex-m3",
    compiler="arm-none-eabi-gcc",
    compiler_flags=("-mcpu=cortex-m3", "-mthumb"),
    notes="Best QEMU support, good for testing",
)


# Board registry
BOARDS: dict[str, BoardConfig] = {
    # STM32
    STM32F103C8.id: STM32F103C8,
    STM32F401RE.id: STM32F401RE,
    STM32F407VG.id: STM32F407VG,
    STM32L476RG.id: STM32L476RG,
    # ESP32
    ESP32.id: ESP32,
    ESP32_S3.id: ESP32_S3,
    ESP32_C3.id: ESP32_C3,
    # Arduino
    ARDUINO_UNO.id: ARDUINO_UNO,
    ARDUINO_NANO.id: ARDUINO_NANO,
    ARDUINO_MEGA.id: ARDUINO_MEGA,
    ARDUINO_DUE.id: ARDUINO_DUE,
    # Generic
    LM3S6965.id: LM3S6965,
}

# Boards with full QEMU support (recommended for simulation)
QEMU_SUPPORTED_BOARDS = [b for b in BOARDS.values() if b.qemu_machine is not None]

# Default board for simulation
DEFAULT_BOARD = LM3S6965


def get_board(board_id: str) -> BoardConfig:
    if board_id not in BOARDS:
        available = ", ".join(BOARDS.keys())
        raise ValueError(f"Unknown board: {board_id}. Available: {available}")
    return BOARDS[board_id]


def list_boards_by_arch(arch: Architecture) -> list[BoardConfig]:
    return [b for b in BOARDS.values() if b.arch == arch]


def list_boards_table() -> str:
    """Return a formatted table of all boards."""
    lines = [
        "| ID | Name | Arch | Flash | RAM | QEMU |",
        "|---|---|---|---|---|---|",
    ]
    for b in BOARDS.values():
        qemu = "Yes" if b.qemu_machine else "No"
        lines.append(
            f"| {b.id} | {b.name} | {b.arch.value} | {b.flash_kb}KB | {b.ram_kb}KB | {qemu} |"
        )
    return "\n".join(lines)


def check_toolchain_available(board: BoardConfig) -> tuple[bool, str | None]:
    """Check if the compiler toolchain for a board is available.

    Returns (available, error_message).
    """
    import shutil

    compiler = board.compiler
    if shutil.which(compiler) is None:
        # Find alternative boards with available toolchains
        available_boards = []
        for b in QEMU_SUPPORTED_BOARDS:
            if shutil.which(b.compiler):
                available_boards.append(b.id)

        suggestion = ""
        if available_boards:
            suggestion = f" Try one of these boards instead: {', '.join(available_boards[:3])}"

        return False, (
            f"Compiler '{compiler}' not found for board '{board.name}'. "
            f"Please install the toolchain or select a different board.{suggestion}"
        )

    return True, None


def get_available_boards() -> list[BoardConfig]:
    """Return boards that have their toolchain installed."""
    import shutil
    return [b for b in BOARDS.values() if shutil.which(b.compiler)]
