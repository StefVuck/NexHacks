"""Flash manager for orchestrating firmware flashing to hardware devices."""

import asyncio
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Callable, Awaitable, Optional

from flasher import detect_devices, flash_esp32, flash_stm32
from flasher import DeviceInfo as FlasherDeviceInfo
from flasher.esp32 import FlashResult


class FlashStatus(str, Enum):
    """Status of a flash operation."""
    IDLE = "idle"
    PREPARING = "preparing"
    ERASING = "erasing"
    WRITING = "writing"
    VERIFYING = "verifying"
    COMPLETE = "complete"
    ERROR = "error"


@dataclass
class FlashProgress:
    """Progress update for a flash operation."""
    port: str
    node_id: str
    status: FlashStatus
    percent: int = 0
    stage: str = ""
    message: Optional[str] = None
    error: Optional[str] = None


@dataclass
class DeviceInfo:
    """Device information for API responses."""
    port: str
    board_type: str
    chip_name: str
    vid: str
    pid: str
    assigned_node: Optional[str] = None


@dataclass
class NodeAssignment:
    """Assignment of a node to a device port."""
    node_id: str
    port: str
    firmware_path: Optional[str] = None


@dataclass
class FlashJob:
    """A flash job with its current state."""
    node_id: str
    port: str
    firmware_path: Path
    status: FlashStatus = FlashStatus.IDLE
    progress: int = 0
    error: Optional[str] = None
    task: Optional[asyncio.Task] = None


class FlashManager:
    """
    Manages firmware flashing operations for multiple devices.

    Supports parallel flashing and progress tracking via callbacks.
    """

    def __init__(
        self,
        firmware_base_dir: Path,
        progress_callback: Optional[Callable[[FlashProgress], Awaitable[None]]] = None,
    ):
        """
        Initialize FlashManager.

        Args:
            firmware_base_dir: Base directory containing compiled firmware
                              (e.g., builds/firmware/{node_id}/)
            progress_callback: Async callback for progress updates
        """
        self.firmware_base_dir = Path(firmware_base_dir)
        self.progress_callback = progress_callback
        self._jobs: dict[str, FlashJob] = {}  # port -> job
        self._assignments: dict[str, str] = {}  # port -> node_id

    async def _emit_progress(self, progress: FlashProgress):
        """Emit progress update via callback."""
        if self.progress_callback:
            await self.progress_callback(progress)

    def scan_devices(self) -> list[DeviceInfo]:
        """
        Scan for connected USB devices.

        Returns:
            List of detected devices with their info
        """
        flasher_devices = detect_devices()
        devices = []

        for dev in flasher_devices:
            devices.append(DeviceInfo(
                port=dev.port,
                board_type=dev.board_type,
                chip_name=dev.chip_name,
                vid=dev.vid,
                pid=dev.pid,
                assigned_node=self._assignments.get(dev.port),
            ))

        return devices

    def assign_node(self, port: str, node_id: str):
        """
        Assign a node to a device port.

        Args:
            port: Device port (e.g., /dev/ttyUSB0)
            node_id: Node identifier to assign
        """
        self._assignments[port] = node_id

    def unassign_node(self, port: str):
        """Remove node assignment from a port."""
        self._assignments.pop(port, None)

    def get_assignments(self) -> dict[str, str]:
        """Get current port->node_id assignments."""
        return self._assignments.copy()

    def _find_firmware(self, node_id: str) -> Optional[Path]:
        """
        Find the firmware file for a node.

        Searches in firmware_base_dir/{node_id}/ for:
        - firmware.bin (ESP32)
        - firmware.elf (ARM/STM32)

        Args:
            node_id: Node identifier

        Returns:
            Path to firmware file or None
        """
        node_dir = self.firmware_base_dir / node_id

        if not node_dir.exists():
            return None

        # Try common firmware file names
        for filename in ["firmware.bin", "firmware.elf", f"{node_id}.bin", f"{node_id}.elf"]:
            firmware_path = node_dir / filename
            if firmware_path.exists():
                return firmware_path

        # Find any .bin or .elf file
        for ext in [".bin", ".elf"]:
            files = list(node_dir.glob(f"*{ext}"))
            if files:
                return files[0]

        return None

    def _get_board_type(self, port: str) -> Optional[str]:
        """Get board type for a port by scanning devices."""
        devices = self.scan_devices()
        for dev in devices:
            if dev.port == port:
                return dev.board_type
        return None

    async def flash_device(
        self,
        port: str,
        node_id: str,
        firmware_path: Optional[Path] = None,
    ) -> FlashResult:
        """
        Flash firmware to a specific device.

        Args:
            port: Device port
            node_id: Node identifier
            firmware_path: Optional explicit firmware path (auto-detected if None)

        Returns:
            FlashResult with success status
        """
        # Find firmware if not provided
        if firmware_path is None:
            firmware_path = self._find_firmware(node_id)
            if firmware_path is None:
                error = f"Firmware not found for node {node_id}"
                await self._emit_progress(FlashProgress(
                    port=port,
                    node_id=node_id,
                    status=FlashStatus.ERROR,
                    error=error,
                ))
                return FlashResult(success=False, output="", error=error)

        # Verify device is connected
        board_type = self._get_board_type(port)
        if board_type is None:
            error = f"Device not found on port {port}"
            await self._emit_progress(FlashProgress(
                port=port,
                node_id=node_id,
                status=FlashStatus.ERROR,
                error=error,
            ))
            return FlashResult(success=False, output="", error=error)

        # Start flash job
        job = FlashJob(
            node_id=node_id,
            port=port,
            firmware_path=firmware_path,
            status=FlashStatus.PREPARING,
        )
        self._jobs[port] = job

        await self._emit_progress(FlashProgress(
            port=port,
            node_id=node_id,
            status=FlashStatus.PREPARING,
            percent=5,
            stage="preparing",
        ))

        # Simulate erasing stage
        await asyncio.sleep(0.5)
        job.status = FlashStatus.ERASING
        job.progress = 15
        await self._emit_progress(FlashProgress(
            port=port,
            node_id=node_id,
            status=FlashStatus.ERASING,
            percent=15,
            stage="erasing",
        ))

        # Simulate writing start
        await asyncio.sleep(0.5)
        job.status = FlashStatus.WRITING
        job.progress = 25
        await self._emit_progress(FlashProgress(
            port=port,
            node_id=node_id,
            status=FlashStatus.WRITING,
            percent=25,
            stage="writing",
        ))

        # Actually flash the device
        try:
            if board_type.startswith("esp32"):
                # Determine chip variant
                chip = "esp32"
                if "s3" in board_type.lower():
                    chip = "esp32s3"
                elif "s2" in board_type.lower():
                    chip = "esp32s2"
                elif "c3" in board_type.lower():
                    chip = "esp32c3"

                result = await asyncio.to_thread(
                    flash_esp32,
                    firmware_path,
                    port,
                    chip=chip,
                )
            elif board_type == "stm32":
                result = await asyncio.to_thread(
                    flash_stm32,
                    firmware_path,
                    port,
                )
            else:
                result = FlashResult(
                    success=False,
                    output="",
                    error=f"Unsupported board type: {board_type}",
                )

        except Exception as e:
            result = FlashResult(
                success=False,
                output="",
                error=str(e),
            )

        # Update job status based on result
        if result.success:
            job.status = FlashStatus.VERIFYING
            job.progress = 90
            await self._emit_progress(FlashProgress(
                port=port,
                node_id=node_id,
                status=FlashStatus.VERIFYING,
                percent=90,
                stage="verifying",
            ))

            await asyncio.sleep(0.3)

            job.status = FlashStatus.COMPLETE
            job.progress = 100
            await self._emit_progress(FlashProgress(
                port=port,
                node_id=node_id,
                status=FlashStatus.COMPLETE,
                percent=100,
                stage="complete",
                message=result.output[:200] if result.output else "Flash complete",
            ))
        else:
            job.status = FlashStatus.ERROR
            job.error = result.error
            await self._emit_progress(FlashProgress(
                port=port,
                node_id=node_id,
                status=FlashStatus.ERROR,
                error=result.error,
            ))

        return result

    async def flash_all(
        self,
        assignments: Optional[list[NodeAssignment]] = None,
    ) -> dict[str, FlashResult]:
        """
        Flash all assigned devices in parallel.

        Args:
            assignments: Optional list of explicit assignments.
                        Uses internal assignments if None.

        Returns:
            Dict mapping port -> FlashResult
        """
        if assignments is None:
            # Use internal assignments
            assignments = [
                NodeAssignment(node_id=node_id, port=port)
                for port, node_id in self._assignments.items()
            ]

        if not assignments:
            return {}

        # Create flash tasks
        tasks = {}
        for assignment in assignments:
            task = asyncio.create_task(
                self.flash_device(
                    port=assignment.port,
                    node_id=assignment.node_id,
                    firmware_path=Path(assignment.firmware_path) if assignment.firmware_path else None,
                )
            )
            tasks[assignment.port] = task

        # Wait for all to complete
        results = {}
        for port, task in tasks.items():
            try:
                results[port] = await task
            except Exception as e:
                results[port] = FlashResult(
                    success=False,
                    output="",
                    error=str(e),
                )

        return results

    def get_job_status(self, port: str) -> Optional[FlashJob]:
        """Get status of a flash job by port."""
        return self._jobs.get(port)

    def get_all_job_statuses(self) -> dict[str, FlashJob]:
        """Get status of all flash jobs."""
        return self._jobs.copy()

    def cancel_job(self, port: str) -> bool:
        """
        Cancel a running flash job.

        Note: May not be safe mid-flash - use with caution.

        Args:
            port: Device port

        Returns:
            True if job was cancelled
        """
        job = self._jobs.get(port)
        if job and job.task and not job.task.done():
            job.task.cancel()
            job.status = FlashStatus.ERROR
            job.error = "Cancelled by user"
            return True
        return False

    def clear_jobs(self):
        """Clear all completed jobs."""
        self._jobs = {
            port: job
            for port, job in self._jobs.items()
            if job.status not in [FlashStatus.COMPLETE, FlashStatus.ERROR]
        }
