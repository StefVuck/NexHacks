"""USB device detection for embedded boards."""

import subprocess
from dataclasses import dataclass

# Known USB VID:PID pairs for common boards
KNOWN_DEVICES = {
    # ESP32 boards (various USB-UART chips)
    ("10c4", "ea60"): ("esp32", "Silicon Labs CP210x"),
    ("1a86", "7523"): ("esp32", "CH340"),
    ("1a86", "55d4"): ("esp32", "CH9102"),
    ("0403", "6001"): ("esp32", "FTDI FT232"),
    ("303a", "1001"): ("esp32s3", "ESP32-S3 native USB"),
    # STM32 boards
    ("0483", "374b"): ("stm32", "ST-Link V2.1"),
    ("0483", "3748"): ("stm32", "ST-Link V2"),
    ("0483", "5740"): ("stm32", "STM32 Virtual COM"),
    # Arduino boards
    ("2341", "0043"): ("arduino_uno", "Arduino Uno"),
    ("2341", "0001"): ("arduino_uno", "Arduino Uno (old)"),
    ("2341", "003d"): ("arduino_due", "Arduino Due (prog)"),
    ("2341", "003e"): ("arduino_due", "Arduino Due (native)"),
    ("2341", "0042"): ("arduino_mega", "Arduino Mega 2560"),
    ("1b4f", "9206"): ("arduino_pro_micro", "SparkFun Pro Micro"),
}


@dataclass
class DeviceInfo:
    """Detected USB device."""
    port: str
    board_type: str
    chip_name: str
    vid: str
    pid: str

    @property
    def display_name(self) -> str:
        return f"{self.board_type} ({self.chip_name}) on {self.port}"


def detect_devices() -> list[DeviceInfo]:
    """Detect connected embedded development boards.

    Returns:
        List of detected devices with port and board type
    """
    devices = []

    # Try pyserial first (cross-platform)
    try:
        import serial.tools.list_ports
        for port in serial.tools.list_ports.comports():
            vid = f"{port.vid:04x}" if port.vid else None
            pid = f"{port.pid:04x}" if port.pid else None

            if vid and pid and (vid, pid) in KNOWN_DEVICES:
                board_type, chip_name = KNOWN_DEVICES[(vid, pid)]
                devices.append(DeviceInfo(
                    port=port.device,
                    board_type=board_type,
                    chip_name=chip_name,
                    vid=vid,
                    pid=pid,
                ))
            elif port.device.startswith(("/dev/ttyUSB", "/dev/ttyACM", "/dev/cu.usb")):
                # Unknown but likely a dev board
                devices.append(DeviceInfo(
                    port=port.device,
                    board_type="unknown",
                    chip_name=port.description or "Unknown USB Serial",
                    vid=vid or "????",
                    pid=pid or "????",
                ))
        return devices
    except ImportError:
        pass

    # Fallback: list /dev/tty* on Unix
    try:
        result = subprocess.run(
            ["ls", "/dev/"],
            capture_output=True,
            text=True,
        )
        for line in result.stdout.split():
            if line.startswith(("ttyUSB", "ttyACM", "cu.usb", "cu.SLAB")):
                port = f"/dev/{line}"
                # Guess type from name
                if "SLAB" in line or "CP210" in line:
                    board_type = "esp32"
                elif "ACM" in line:
                    board_type = "stm32"
                else:
                    board_type = "unknown"

                devices.append(DeviceInfo(
                    port=port,
                    board_type=board_type,
                    chip_name="Unknown",
                    vid="????",
                    pid="????",
                ))
    except Exception:
        pass

    return devices


def wait_for_device(board_type: str | None = None, timeout: float = 30.0) -> DeviceInfo | None:
    """Wait for a device to be connected.

    Args:
        board_type: Optional filter for specific board type
        timeout: Maximum seconds to wait

    Returns:
        DeviceInfo if found, None if timeout
    """
    import time
    start = time.time()
    seen_ports = set()

    while time.time() - start < timeout:
        devices = detect_devices()
        for dev in devices:
            if dev.port not in seen_ports:
                seen_ports.add(dev.port)
                if board_type is None or dev.board_type == board_type:
                    return dev
        time.sleep(0.5)

    return None
