"""STM32 flashing via stm32flash or ST-Link."""

import subprocess
from dataclasses import dataclass
from pathlib import Path


@dataclass
class FlashResult:
    """Result of a flash operation."""
    success: bool
    output: str
    error: str | None = None


def flash_stm32(
    firmware_path: Path | str,
    port: str | None = None,
    method: str = "auto",
) -> FlashResult:
    """Flash firmware to STM32.

    Args:
        firmware_path: Path to .bin or .elf firmware file
        port: Serial port for UART bootloader (e.g., /dev/ttyUSB0)
        method: "uart" for stm32flash, "stlink" for st-flash, "auto" to detect

    Returns:
        FlashResult with success status
    """
    firmware_path = Path(firmware_path)

    if not firmware_path.exists():
        return FlashResult(
            success=False,
            output="",
            error=f"Firmware file not found: {firmware_path}",
        )

    if method == "auto":
        # Try ST-Link first, then UART
        result = _flash_stlink(firmware_path)
        if result.success:
            return result
        if port:
            return _flash_uart(firmware_path, port)
        return result

    elif method == "stlink":
        return _flash_stlink(firmware_path)

    elif method == "uart":
        if not port:
            return FlashResult(
                success=False,
                output="",
                error="Serial port required for UART flashing",
            )
        return _flash_uart(firmware_path, port)

    else:
        return FlashResult(
            success=False,
            output="",
            error=f"Unknown flash method: {method}",
        )


def _flash_stlink(firmware_path: Path) -> FlashResult:
    """Flash using ST-Link (st-flash from stlink tools)."""
    # Determine file format and address
    if firmware_path.suffix == ".bin":
        cmd = ["st-flash", "write", str(firmware_path), "0x8000000"]
    elif firmware_path.suffix == ".elf":
        cmd = ["st-flash", "--format=ihex", "write", str(firmware_path)]
    else:
        return FlashResult(
            success=False,
            output="",
            error=f"Unsupported file format: {firmware_path.suffix}",
        )

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60,
        )

        return FlashResult(
            success=result.returncode == 0,
            output=result.stdout + result.stderr,
            error=None if result.returncode == 0 else result.stderr,
        )

    except FileNotFoundError:
        return FlashResult(
            success=False,
            output="",
            error="st-flash not found. Install stlink tools.",
        )
    except subprocess.TimeoutExpired:
        return FlashResult(
            success=False,
            output="",
            error="ST-Link flash timed out (60s)",
        )


def _flash_uart(firmware_path: Path, port: str) -> FlashResult:
    """Flash using UART bootloader (stm32flash)."""
    if firmware_path.suffix != ".bin":
        return FlashResult(
            success=False,
            output="",
            error="stm32flash requires .bin file",
        )

    cmd = [
        "stm32flash",
        "-w", str(firmware_path),
        "-v",  # Verify after write
        "-g", "0x0",  # Start execution
        port,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
        )

        return FlashResult(
            success=result.returncode == 0,
            output=result.stdout,
            error=result.stderr if result.returncode != 0 else None,
        )

    except FileNotFoundError:
        return FlashResult(
            success=False,
            output="",
            error="stm32flash not found. Install with: brew install stm32flash",
        )
    except subprocess.TimeoutExpired:
        return FlashResult(
            success=False,
            output="",
            error="UART flash timed out (120s)",
        )


def reset_stm32_stlink() -> FlashResult:
    """Reset STM32 via ST-Link."""
    try:
        result = subprocess.run(
            ["st-flash", "reset"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        return FlashResult(
            success=result.returncode == 0,
            output=result.stdout,
            error=result.stderr if result.returncode != 0 else None,
        )
    except Exception as e:
        return FlashResult(success=False, output="", error=str(e))
