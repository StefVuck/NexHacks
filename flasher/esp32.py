"""ESP32 flashing via esptool."""

import subprocess
from dataclasses import dataclass
from pathlib import Path


@dataclass
class FlashResult:
    """Result of a flash operation."""
    success: bool
    output: str
    error: str | None = None


def flash_esp32(
    firmware_path: Path | str,
    port: str,
    baud: int = 460800,
    chip: str = "esp32",
) -> FlashResult:
    """Flash firmware to ESP32 using esptool.

    Args:
        firmware_path: Path to .bin firmware file
        port: Serial port (e.g., /dev/ttyUSB0)
        baud: Baud rate for flashing
        chip: Chip type (esp32, esp32s2, esp32s3, esp32c3)

    Returns:
        FlashResult with success status and output
    """
    firmware_path = Path(firmware_path)

    if not firmware_path.exists():
        return FlashResult(
            success=False,
            output="",
            error=f"Firmware file not found: {firmware_path}",
        )

    # Build esptool command
    cmd = [
        "esptool.py",
        "--chip", chip,
        "--port", port,
        "--baud", str(baud),
        "write_flash",
        "0x0", str(firmware_path),
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
        )

        if result.returncode == 0:
            return FlashResult(
                success=True,
                output=result.stdout,
            )
        else:
            return FlashResult(
                success=False,
                output=result.stdout,
                error=result.stderr,
            )

    except subprocess.TimeoutExpired:
        return FlashResult(
            success=False,
            output="",
            error="Flash operation timed out (120s)",
        )
    except FileNotFoundError:
        return FlashResult(
            success=False,
            output="",
            error="esptool.py not found. Install with: pip install esptool",
        )


def flash_esp32_platformio(
    project_dir: Path | str,
    port: str,
    environment: str = "esp32",
) -> FlashResult:
    """Flash using PlatformIO (handles compilation too).

    Args:
        project_dir: Path to PlatformIO project
        port: Serial port
        environment: PlatformIO environment name

    Returns:
        FlashResult with success status
    """
    project_dir = Path(project_dir)

    cmd = [
        "pio", "run",
        "-d", str(project_dir),
        "-e", environment,
        "-t", "upload",
        "--upload-port", port,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
        )

        return FlashResult(
            success=result.returncode == 0,
            output=result.stdout,
            error=result.stderr if result.returncode != 0 else None,
        )

    except subprocess.TimeoutExpired:
        return FlashResult(
            success=False,
            output="",
            error="PlatformIO upload timed out (300s)",
        )
    except FileNotFoundError:
        return FlashResult(
            success=False,
            output="",
            error="pio not found. Install with: pip install platformio",
        )


def erase_esp32(port: str, chip: str = "esp32") -> FlashResult:
    """Erase ESP32 flash memory."""
    cmd = [
        "esptool.py",
        "--chip", chip,
        "--port", port,
        "erase_flash",
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        return FlashResult(
            success=result.returncode == 0,
            output=result.stdout,
            error=result.stderr if result.returncode != 0 else None,
        )
    except Exception as e:
        return FlashResult(success=False, output="", error=str(e))
