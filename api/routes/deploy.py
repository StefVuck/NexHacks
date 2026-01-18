"""Deploy stage API routes - Cloud provisioning and hardware flashing."""

import asyncio
import os
import random
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from api.sessions import session_manager
from config.settings import settings
from api.models import (
    DeviceInfo,
    NodeAssignment,
    FlashRequest,
    FlashAllRequest,
    FlashProgress,
    CloudDeployRequest,
    CloudStatus,
    TerraformOutputs,
    DeployStatusResponse,
    DeploySettingsRequest,
    NodeTelemetry,
    LiveStatusResponse,
)
from api.services.deploy import TerraformRunner, TerraformStatus, FlashManager
from api.services.deploy.flash_manager import FlashProgress as FlashProgressInternal

router = APIRouter()

# Base paths
PROJECT_ROOT = Path(__file__).parent.parent.parent
INFRA_DIR = PROJECT_ROOT / "infra"
BUILDS_DIR = PROJECT_ROOT / "builds"
TERRAFORM_WORKING_DIR = BUILDS_DIR / "terraform"

# Ensure directories exist
TERRAFORM_WORKING_DIR.mkdir(parents=True, exist_ok=True)
(BUILDS_DIR / "firmware").mkdir(parents=True, exist_ok=True)


# ============================================================================
# Device Management
# ============================================================================

# Simulated devices for demo mode
SIMULATED_DEVICES = [
    DeviceInfo(
        port="/dev/ttyUSB0",
        board_type="esp32",
        chip_name="ESP32-WROOM-32",
        vid="10c4",
        pid="ea60",
        assigned_node=None,
    ),
    DeviceInfo(
        port="/dev/ttyUSB1",
        board_type="stm32f103c8",
        chip_name="STM32F103C8 (Blue Pill)",
        vid="0483",
        pid="5740",
        assigned_node=None,
    ),
    DeviceInfo(
        port="/dev/ttyACM0",
        board_type="lm3s6965",
        chip_name="LM3S6965 Stellaris",
        vid="1cbe",
        pid="00fd",
        assigned_node=None,
    ),
]


@router.get("/devices", response_model=list[DeviceInfo])
async def list_devices(session_id: Optional[str] = Query(None)):
    """
    List connected USB devices.

    If session_id is provided, includes node assignments for that session.
    In demo mode (SIMULATE_HARDWARE=true), returns simulated devices.
    """
    # Use simulated devices in demo mode
    if settings.simulate_hardware:
        devices = [DeviceInfo(**d.model_dump()) for d in SIMULATED_DEVICES]
    else:
        flash_manager = FlashManager(BUILDS_DIR / "firmware")
        devices = [
            DeviceInfo(
                port=d.port,
                board_type=d.board_type,
                chip_name=d.chip_name,
                vid=d.vid,
                pid=d.pid,
                assigned_node=d.assigned_node,
            )
            for d in flash_manager.scan_devices()
        ]

    # Add session-specific assignments
    if session_id:
        session = session_manager.get_session(session_id)
        if session:
            for device in devices:
                device.assigned_node = session.flash_assignments.get(device.port)

    return devices


@router.post("/devices/scan", response_model=list[DeviceInfo])
async def force_scan_devices(session_id: Optional[str] = Query(None)):
    """Force a rescan of USB devices."""
    return await list_devices(session_id)


@router.post("/{session_id}/assign")
async def assign_node_to_device(session_id: str, assignment: NodeAssignment):
    """Assign a node to a specific device port."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.flash_assignments[assignment.port] = assignment.node_id

    # Broadcast assignment update
    await session_manager.broadcast_to_session(session_id, {
        "stage": "deploy",
        "type": "assignment_updated",
        "data": {
            "port": assignment.port,
            "node_id": assignment.node_id,
        }
    })

    return {"status": "assigned", "port": assignment.port, "node_id": assignment.node_id}


@router.delete("/{session_id}/assign/{port:path}")
async def unassign_node_from_device(session_id: str, port: str):
    """Remove node assignment from a device port."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # URL decode the port (e.g., %2Fdev%2FttyUSB0 -> /dev/ttyUSB0)
    import urllib.parse
    port = urllib.parse.unquote(port)

    session.flash_assignments.pop(port, None)

    await session_manager.broadcast_to_session(session_id, {
        "stage": "deploy",
        "type": "assignment_removed",
        "data": {"port": port}
    })

    return {"status": "unassigned", "port": port}


# ============================================================================
# Firmware Flashing
# ============================================================================

@router.post("/{session_id}/flash")
async def flash_firmware(session_id: str, request: FlashRequest):
    """
    Flash firmware to a connected device.

    Progress is broadcast via WebSocket with events:
    - flash_started
    - flash_progress
    - flash_complete / flash_error

    In demo mode (SIMULATE_HARDWARE=true), simulates the flashing process.
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.build_state.status.value != "success":
        raise HTTPException(status_code=400, detail="Build must complete successfully first")

    # Simulated flashing for demo mode
    if settings.simulate_hardware:
        async def simulate_flash():
            stages = [
                ("connecting", "Connecting to device...", 0),
                ("erasing", "Erasing flash memory...", 20),
                ("writing", "Writing firmware (0%)...", 30),
                ("writing", "Writing firmware (25%)...", 45),
                ("writing", "Writing firmware (50%)...", 60),
                ("writing", "Writing firmware (75%)...", 75),
                ("writing", "Writing firmware (100%)...", 90),
                ("verifying", "Verifying firmware...", 95),
                ("complete", "Flash complete!", 100),
            ]

            for stage, message, percent in stages:
                status = "progress" if percent < 100 else "complete"
                flash_data = {
                    "port": request.port,
                    "node_id": request.node_id,
                    "status": status,
                    "percent": percent,
                    "stage": stage,
                    "message": message,
                    "error": None,
                }
                session.flash_status[request.port] = flash_data

                await session_manager.broadcast_to_session(session_id, {
                    "stage": "deploy",
                    "type": f"flash_{status}",
                    "data": flash_data,
                })

                await asyncio.sleep(0.5)  # Simulate delay

        asyncio.create_task(simulate_flash())
        return {
            "status": "started",
            "message": f"Flashing {request.node_id} to {request.port} (simulated)",
        }

    # Real flashing
    async def on_progress(progress: FlashProgressInternal):
        session.flash_status[request.port] = FlashProgress(
            port=progress.port,
            node_id=progress.node_id,
            status=progress.status.value,
            percent=progress.percent,
            stage=progress.stage,
            message=progress.message,
            error=progress.error,
        ).model_dump()

        await session_manager.broadcast_to_session(session_id, {
            "stage": "deploy",
            "type": f"flash_{progress.status.value}",
            "data": session.flash_status[request.port],
        })

    flash_manager = FlashManager(
        firmware_base_dir=BUILDS_DIR / "firmware",
        progress_callback=on_progress,
    )

    async def do_flash():
        await flash_manager.flash_device(
            port=request.port,
            node_id=request.node_id,
        )

    asyncio.create_task(do_flash())

    return {
        "status": "started",
        "message": f"Flashing {request.node_id} to {request.port}",
    }


@router.post("/{session_id}/flash/all")
async def flash_all_firmware(session_id: str, request: Optional[FlashAllRequest] = None):
    """
    Flash firmware to all assigned devices.

    If no explicit assignments provided, uses session assignments.
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.build_state.status.value != "success":
        raise HTTPException(status_code=400, detail="Build must complete successfully first")

    # Get assignments
    if request and request.assignments:
        assignments = request.assignments
    else:
        assignments = [
            NodeAssignment(node_id=node_id, port=port)
            for port, node_id in session.flash_assignments.items()
        ]

    if not assignments:
        raise HTTPException(status_code=400, detail="No devices assigned")

    # Progress callback
    async def on_progress(progress: FlashProgressInternal):
        session.flash_status[progress.port] = FlashProgress(
            port=progress.port,
            node_id=progress.node_id,
            status=progress.status.value,
            percent=progress.percent,
            stage=progress.stage,
            message=progress.message,
            error=progress.error,
        ).model_dump()

        await session_manager.broadcast_to_session(session_id, {
            "stage": "deploy",
            "type": f"flash_{progress.status.value}",
            "data": session.flash_status[progress.port],
        })

    flash_manager = FlashManager(
        firmware_base_dir=BUILDS_DIR / "firmware",
        progress_callback=on_progress,
    )

    # Flash all in background
    async def do_flash_all():
        from api.services.deploy.flash_manager import NodeAssignment as InternalAssignment
        internal_assignments = [
            InternalAssignment(node_id=a.node_id, port=a.port, firmware_path=a.firmware_path)
            for a in assignments
        ]
        await flash_manager.flash_all(internal_assignments)

    asyncio.create_task(do_flash_all())

    return {
        "status": "started",
        "message": f"Flashing {len(assignments)} devices",
        "devices": [a.port for a in assignments],
    }


@router.get("/{session_id}/flash/status")
async def get_flash_status(session_id: str) -> dict[str, FlashProgress]:
    """Get flash progress for all devices in session."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return session.flash_status


# ============================================================================
# Cloud Deployment (Terraform)
# ============================================================================

@router.get("/cloud/check")
async def check_cloud_prerequisites():
    """
    Check if cloud deployment prerequisites are met.

    Returns status of Terraform and AWS credentials.
    In demo mode (SIMULATE_CLOUD=true), always returns ready=True.
    """
    # In cloud demo mode, skip real prerequisite checks
    if settings.simulate_cloud:
        return {
            "terraform_installed": True,
            "aws_configured": True,
            "ready": True,
            "demo_mode": True,
            "messages": [],
        }

    runner = TerraformRunner(INFRA_DIR, TERRAFORM_WORKING_DIR)

    terraform_installed = await runner.check_installed()
    aws_configured = await runner.check_aws_credentials()

    return {
        "terraform_installed": terraform_installed,
        "aws_configured": aws_configured,
        "ready": terraform_installed and aws_configured,
        "demo_mode": False,
        "messages": [
            None if terraform_installed else "Terraform not found. Install from terraform.io",
            None if aws_configured else "AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY",
        ],
    }


@router.post("/{session_id}/cloud/start")
async def start_cloud_deployment(session_id: str, request: CloudDeployRequest):
    """
    Start cloud deployment using Terraform.

    Progress is broadcast via WebSocket with events:
    - cloud_status (status changes)
    - terraform_progress (resource-level updates)
    - terraform_outputs (final outputs)
    - terraform_error (on failure)

    In demo mode (SIMULATE_HARDWARE=true), simulates deployment without Terraform.
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.cloud_status in ["applying", "initializing", "planning"]:
        raise HTTPException(status_code=400, detail="Deployment already in progress")

    # Cloud demo mode - simulate deployment without Terraform
    if settings.simulate_cloud:
        session.cloud_status = "initializing"
        session.cloud_step = "Starting deployment"
        session.cloud_progress = 0

        # Hardcoded server IP for demo - replace with your actual server
        DEMO_SERVER_IP = "18.234.112.45"  # TODO: Replace with actual deployed server IP

        async def simulate_deployment():
            # Realistic Terraform-like deployment stages
            stages = [
                # Init phase
                ("initializing", "Initializing Terraform backend...", 5, 0.5),
                ("initializing", "Initializing provider plugins...", 8, 0.8),
                ("initializing", "Finding hashicorp/aws versions matching ~> 5.0...", 10, 0.6),
                ("initializing", "Installing hashicorp/aws v5.100.0...", 15, 1.2),
                ("initializing", "Terraform has been successfully initialized!", 18, 0.3),

                # Plan phase
                ("planning", "Creating execution plan...", 20, 0.5),
                ("planning", "data.aws_ami.ubuntu: Reading...", 22, 0.4),
                ("planning", "data.aws_ami.ubuntu: Read complete [id=ami-0030e4319cbf4dbf2]", 25, 0.3),
                ("planning", "Plan: 3 to add, 0 to change, 0 to destroy", 30, 0.5),

                # Apply phase - Security Group
                ("applying", "aws_security_group.aggregation_server: Creating...", 35, 0.8),
                ("applying", "aws_security_group.aggregation_server: Creation complete [id=sg-0abc123def456]", 40, 0.3),

                # Apply phase - EC2 Instance
                ("applying", "aws_instance.aggregation_server: Creating...", 45, 1.0),
                ("applying", "aws_instance.aggregation_server: Still creating... [10s elapsed]", 50, 2.0),
                ("applying", "aws_instance.aggregation_server: Still creating... [20s elapsed]", 55, 2.0),
                ("applying", "aws_instance.aggregation_server: Still creating... [30s elapsed]", 60, 2.0),
                ("applying", "aws_instance.aggregation_server: Creation complete [id=i-0abc123def456789]", 70, 0.5),

                # Apply phase - Elastic IP
                ("applying", "aws_eip.aggregation_server: Creating...", 75, 0.6),
                ("applying", "aws_eip.aggregation_server: Creation complete [id=eipalloc-0abc123]", 80, 0.3),

                # Provisioning
                ("applying", "Waiting for server to initialize...", 85, 1.5),
                ("applying", "Installing Docker and dependencies...", 88, 1.0),
                ("applying", "Starting MQTT broker (Mosquitto)...", 92, 0.8),
                ("applying", "Starting aggregation server...", 95, 0.6),
                ("applying", "Apply complete! Resources: 3 added, 0 changed, 0 destroyed.", 98, 0.5),

                # Complete
                ("deployed", "Deployment complete!", 100, 0.3),
            ]

            for status, step, progress, delay in stages:
                session.cloud_status = status
                session.cloud_step = step
                session.cloud_progress = progress

                # Determine message type based on content
                msg_type = "terraform_progress" if any(x in step for x in ["aws_", "data.", "Plan:", "Apply complete"]) else "cloud_status"

                await session_manager.broadcast_to_session(session_id, {
                    "stage": "deploy",
                    "type": msg_type,
                    "data": {
                        "status": status,
                        "step": step,
                        "progress_percent": progress,
                        "message": step,
                    }
                })
                await asyncio.sleep(delay)

            # Set outputs with hardcoded demo server IP
            session.terraform_outputs = {
                "server_ip": DEMO_SERVER_IP,
                "server_url": f"http://{DEMO_SERVER_IP}:8080",
                "mqtt_broker": DEMO_SERVER_IP,
                "mqtt_port": 1883,
                "mqtt_ws_url": f"ws://{DEMO_SERVER_IP}:9001",
                "ssh_command": f"ssh -i ~/.ssh/swarm-key.pem ubuntu@{DEMO_SERVER_IP}",
                "instance_id": "i-0abc123def456789",
                "swarm_id": request.swarm_id,
            }

            await session_manager.broadcast_to_session(session_id, {
                "stage": "deploy",
                "type": "terraform_outputs",
                "data": session.terraform_outputs,
            })

        asyncio.create_task(simulate_deployment())
        return {
            "status": "started",
            "message": f"Simulating deployment to {request.region} (demo mode)",
            "swarm_id": request.swarm_id,
            "demo_mode": True,
        }

    # Real deployment - check prerequisites
    runner = TerraformRunner(INFRA_DIR, TERRAFORM_WORKING_DIR)
    if not await runner.check_installed():
        raise HTTPException(status_code=400, detail="Terraform not installed")
    if not await runner.check_aws_credentials():
        raise HTTPException(status_code=400, detail="AWS credentials not configured")

    # Update session state
    session.cloud_status = "initializing"
    session.cloud_step = "Starting deployment"
    session.cloud_progress = 0
    session.terraform_outputs = None

    # Broadcast initial status
    await session_manager.broadcast_to_session(session_id, {
        "stage": "deploy",
        "type": "cloud_status",
        "data": {
            "status": "initializing",
            "step": "Starting deployment",
            "progress_percent": 0,
        }
    })

    # Run deployment in background
    async def run_deployment():
        try:
            # Initialize
            init_success = await runner.init(session_id)
            if not init_success:
                session.cloud_status = "error"
                session.cloud_message = "Terraform init failed"
                await session_manager.broadcast_to_session(session_id, {
                    "stage": "deploy",
                    "type": "terraform_error",
                    "data": {"error": "Terraform init failed"}
                })
                return

            await session_manager.broadcast_to_session(session_id, {
                "stage": "deploy",
                "type": "cloud_status",
                "data": {
                    "status": "initializing",
                    "step": "Init complete",
                    "progress_percent": 20,
                }
            })

            # Apply
            variables = {
                "swarm_id": request.swarm_id,
                "aws_region": request.region,
                "instance_type": request.instance_type,
                "mqtt_port": request.mqtt_port,
                "http_port": request.http_port,
                "auto_destroy_hours": request.auto_destroy_hours,
            }

            async for progress in runner.apply(session_id, variables):
                session.cloud_status = progress.status.value
                session.cloud_step = progress.step
                session.cloud_progress = progress.progress_percent
                session.cloud_message = progress.message

                await session_manager.broadcast_to_session(session_id, {
                    "stage": "deploy",
                    "type": "terraform_progress" if progress.resource else "cloud_status",
                    "data": {
                        "status": progress.status.value,
                        "step": progress.step,
                        "resource": progress.resource,
                        "action": progress.action,
                        "progress_percent": progress.progress_percent,
                        "message": progress.message,
                    }
                })

                if progress.status == TerraformStatus.ERROR:
                    await session_manager.broadcast_to_session(session_id, {
                        "stage": "deploy",
                        "type": "terraform_error",
                        "data": {"error": progress.message or progress.step}
                    })
                    return

            # Get outputs
            outputs = await runner.get_outputs(session_id)
            if outputs:
                session.terraform_outputs = {
                    "server_ip": outputs.server_ip,
                    "server_url": outputs.server_url,
                    "mqtt_broker": outputs.mqtt_broker,
                    "mqtt_port": outputs.mqtt_port,
                    "mqtt_ws_url": outputs.mqtt_ws_url,
                    "ssh_command": outputs.ssh_command,
                    "instance_id": outputs.instance_id,
                    "swarm_id": outputs.swarm_id,
                }

                await session_manager.broadcast_to_session(session_id, {
                    "stage": "deploy",
                    "type": "terraform_outputs",
                    "data": session.terraform_outputs,
                })

            session.cloud_status = "deployed"
            await session_manager.broadcast_to_session(session_id, {
                "stage": "deploy",
                "type": "cloud_status",
                "data": {
                    "status": "deployed",
                    "step": "Deployment complete",
                    "progress_percent": 100,
                    "outputs": session.terraform_outputs,
                }
            })

        except Exception as e:
            session.cloud_status = "error"
            session.cloud_message = str(e)
            await session_manager.broadcast_to_session(session_id, {
                "stage": "deploy",
                "type": "terraform_error",
                "data": {"error": str(e)}
            })

    session.terraform_task = asyncio.create_task(run_deployment())

    return {
        "status": "started",
        "message": f"Deploying to {request.region}",
        "swarm_id": request.swarm_id,
    }


@router.post("/{session_id}/cloud/destroy")
async def destroy_cloud_deployment(session_id: str, confirm: bool = Query(False)):
    """
    Destroy cloud resources using Terraform.

    Requires confirm=true query parameter.
    """
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Destruction requires confirm=true query parameter"
        )

    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.cloud_status not in ["deployed", "error"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot destroy in current state: {session.cloud_status}"
        )

    session.cloud_status = "destroying"
    session.cloud_step = "Starting destruction"
    session.cloud_progress = 0

    await session_manager.broadcast_to_session(session_id, {
        "stage": "deploy",
        "type": "cloud_status",
        "data": {
            "status": "destroying",
            "step": "Starting destruction",
            "progress_percent": 0,
        }
    })

    runner = TerraformRunner(INFRA_DIR, TERRAFORM_WORKING_DIR)

    async def run_destroy():
        try:
            async for progress in runner.destroy(session_id):
                session.cloud_status = progress.status.value
                session.cloud_step = progress.step
                session.cloud_progress = progress.progress_percent

                await session_manager.broadcast_to_session(session_id, {
                    "stage": "deploy",
                    "type": "terraform_progress" if progress.resource else "cloud_status",
                    "data": {
                        "status": progress.status.value,
                        "step": progress.step,
                        "resource": progress.resource,
                        "action": progress.action,
                        "progress_percent": progress.progress_percent,
                    }
                })

                if progress.status == TerraformStatus.ERROR:
                    await session_manager.broadcast_to_session(session_id, {
                        "stage": "deploy",
                        "type": "terraform_error",
                        "data": {"error": progress.message or progress.step}
                    })
                    return

            session.cloud_status = "destroyed"
            session.terraform_outputs = None

            await session_manager.broadcast_to_session(session_id, {
                "stage": "deploy",
                "type": "cloud_status",
                "data": {
                    "status": "destroyed",
                    "step": "Destruction complete",
                    "progress_percent": 100,
                }
            })

        except Exception as e:
            session.cloud_status = "error"
            session.cloud_message = str(e)
            await session_manager.broadcast_to_session(session_id, {
                "stage": "deploy",
                "type": "terraform_error",
                "data": {"error": str(e)}
            })

    session.terraform_task = asyncio.create_task(run_destroy())

    return {
        "status": "started",
        "message": "Destroying cloud resources",
    }


@router.get("/{session_id}/cloud/status")
async def get_cloud_status(session_id: str) -> CloudStatus:
    """Get current cloud deployment status."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    outputs = None
    if session.terraform_outputs:
        outputs = TerraformOutputs(**session.terraform_outputs)

    return CloudStatus(
        status=session.cloud_status,
        step=session.cloud_step,
        message=session.cloud_message,
        progress_percent=session.cloud_progress,
        outputs=outputs,
    )


# ============================================================================
# Settings
# ============================================================================

@router.post("/{session_id}/settings")
async def update_deploy_settings(session_id: str, settings: DeploySettingsRequest):
    """Update deploy settings for a session."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.deploy_settings = settings.model_dump()

    return {"status": "updated", "settings": session.deploy_settings}


@router.get("/{session_id}/settings")
async def get_deploy_settings(session_id: str) -> DeploySettingsRequest:
    """Get deploy settings for a session."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.deploy_settings:
        return DeploySettingsRequest(**session.deploy_settings)

    return DeploySettingsRequest()


# ============================================================================
# Live Status / Telemetry
# ============================================================================

@router.get("/{session_id}/telemetry")
async def get_telemetry(session_id: str) -> LiveStatusResponse:
    """
    Get live telemetry from deployed nodes.

    Currently returns cached telemetry from the session.
    In production, this would poll the deployed server or use MQTT.
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    nodes = {}
    for node_id, telemetry in session.node_telemetry.items():
        nodes[node_id] = NodeTelemetry(
            node_id=node_id,
            online=telemetry.get("online", False),
            last_seen=telemetry.get("last_seen"),
            readings=telemetry.get("readings", {}),
            alerts=telemetry.get("alerts", []),
        )

    return LiveStatusResponse(
        session_id=session_id,
        nodes=nodes,
        server_online=session.cloud_status == "deployed",
        last_updated=datetime.now().isoformat(),
    )


@router.post("/{session_id}/telemetry/simulate")
async def simulate_telemetry(session_id: str):
    """
    Simulate a single telemetry update for testing.
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    node_ids = _get_session_node_ids(session)
    if not node_ids:
        raise HTTPException(status_code=400, detail="No nodes found")

    await _generate_telemetry_update(session_id, session, node_ids)
    return {"status": "simulated", "nodes": len(node_ids)}


@router.post("/{session_id}/telemetry/start")
async def start_telemetry_simulation(session_id: str, interval_seconds: float = 2.0):
    """
    Start continuous telemetry simulation in the background.

    This simulates live sensor readings from deployed nodes.
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Stop existing simulation if running
    if hasattr(session, 'telemetry_task') and session.telemetry_task:
        session.telemetry_task.cancel()

    node_ids = _get_session_node_ids(session)
    if not node_ids:
        raise HTTPException(status_code=400, detail="No nodes found")

    async def run_telemetry_loop():
        try:
            while True:
                await _generate_telemetry_update(session_id, session, node_ids)
                await asyncio.sleep(interval_seconds)
        except asyncio.CancelledError:
            pass

    session.telemetry_task = asyncio.create_task(run_telemetry_loop())

    return {"status": "started", "interval": interval_seconds, "nodes": len(node_ids)}


@router.post("/{session_id}/telemetry/stop")
async def stop_telemetry_simulation(session_id: str):
    """Stop continuous telemetry simulation."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if hasattr(session, 'telemetry_task') and session.telemetry_task:
        session.telemetry_task.cancel()
        session.telemetry_task = None

    return {"status": "stopped"}


def _get_session_node_ids(session) -> list[str]:
    """Get node IDs from session (build state or system spec)."""
    # Try build state first
    if session.build_state and session.build_state.nodes:
        return list(session.build_state.nodes.keys())

    # Fall back to system spec
    if session.system_spec:
        nodes = session.system_spec.get("nodes", [])
        return [n.get("node_id", n.get("id", f"node_{i}")) for i, n in enumerate(nodes)]

    return []


def _parse_node_data_types(description: str) -> dict:
    """Parse node description to determine what data types to generate."""
    desc_lower = description.lower()
    data_types = {}

    # Traffic/vehicle counting
    if any(k in desc_lower for k in ["traffic", "vehicle", "car", "count"]):
        data_types["vehicle_count"] = {"min": 0, "max": 150, "unit": "vehicles"}
        data_types["avg_speed"] = {"min": 20, "max": 80, "unit": "km/h"}

    # Temperature sensors
    if any(k in desc_lower for k in ["temperature", "temp", "thermal", "heat"]):
        data_types["temperature"] = {"min": 15, "max": 35, "unit": "°C"}

    # Humidity sensors
    if any(k in desc_lower for k in ["humidity", "moisture"]):
        data_types["humidity"] = {"min": 30, "max": 80, "unit": "%"}

    # Air quality
    if any(k in desc_lower for k in ["air", "pollution", "co2", "pm2.5", "quality"]):
        data_types["air_quality_index"] = {"min": 0, "max": 200, "unit": "AQI"}
        data_types["pm25"] = {"min": 5, "max": 100, "unit": "µg/m³"}

    # Light/luminosity
    if any(k in desc_lower for k in ["light", "lux", "brightness", "luminosity"]):
        data_types["light_level"] = {"min": 0, "max": 1000, "unit": "lux"}

    # Motion/presence
    if any(k in desc_lower for k in ["motion", "presence", "occupancy", "people"]):
        data_types["motion_detected"] = {"type": "bool"}
        data_types["occupancy_count"] = {"min": 0, "max": 20, "unit": "people"}

    # Power/energy
    if any(k in desc_lower for k in ["power", "energy", "watt", "electricity"]):
        data_types["power_consumption"] = {"min": 0, "max": 5000, "unit": "W"}

    # Water/flow
    if any(k in desc_lower for k in ["water", "flow", "liquid", "level"]):
        data_types["flow_rate"] = {"min": 0, "max": 100, "unit": "L/min"}
        data_types["water_level"] = {"min": 0, "max": 100, "unit": "%"}

    # Default fallback - generic sensor data
    if not data_types:
        data_types["value"] = {"min": 0, "max": 100, "unit": ""}
        data_types["status"] = {"type": "status"}

    return data_types


async def _generate_telemetry_update(session_id: str, session, node_ids: list[str]):
    """Generate and broadcast telemetry for all nodes based on their descriptions."""
    import random

    # Get node descriptions from session
    node_descriptions = {}
    if session.system_spec and session.system_spec.get("nodes"):
        for node in session.system_spec["nodes"]:
            nid = node.get("node_id", node.get("id", ""))
            node_descriptions[nid] = node.get("description", "")
    if session.build_state and session.build_state.nodes:
        for nid, node_state in session.build_state.nodes.items():
            if hasattr(node_state, 'description'):
                node_descriptions[nid] = node_state.description

    for node_id in node_ids:
        description = node_descriptions.get(node_id, "")
        data_types = _parse_node_data_types(description)

        # Generate readings based on detected data types
        readings = {}
        for key, config in data_types.items():
            if config.get("type") == "bool":
                readings[key] = random.random() > 0.7
            elif config.get("type") == "status":
                readings[key] = random.choice(["active", "idle", "standby"])
            else:
                min_val = config.get("min", 0)
                max_val = config.get("max", 100)
                # Add some consistency per node
                base = min_val + (hash(node_id + key) % int((max_val - min_val) * 0.5))
                variance = (max_val - min_val) * 0.2
                value = base + random.uniform(-variance, variance)
                readings[key] = round(value, 1) if isinstance(min_val, float) or variance < 10 else int(value)

        # Add common fields
        readings["rssi"] = round(-50 + random.uniform(-20, 10), 0)

        # Check for alerts based on data
        alerts = []
        if readings.get("temperature", 0) > 32:
            alerts.append(f"High temperature: {readings['temperature']}°C")
        if readings.get("air_quality_index", 0) > 150:
            alerts.append(f"Poor air quality: AQI {readings['air_quality_index']}")
        if readings.get("vehicle_count", 0) > 120:
            alerts.append(f"Heavy traffic: {readings['vehicle_count']} vehicles")

        # Occasional offline status (5% chance)
        online = random.random() > 0.05

        telemetry = {
            "online": online,
            "last_seen": datetime.now().isoformat() if online else session.node_telemetry.get(node_id, {}).get("last_seen"),
            "readings": readings if online else session.node_telemetry.get(node_id, {}).get("readings", {}),
            "alerts": alerts,
        }

        session.node_telemetry[node_id] = telemetry

        await session_manager.broadcast_to_session(session_id, {
            "stage": "deploy",
            "type": "telemetry",
            "data": {
                "node_id": node_id,
                **telemetry,
            }
        })


# ============================================================================
# Full Status
# ============================================================================

@router.get("/{session_id}/status")
async def get_deploy_status(session_id: str) -> DeployStatusResponse:
    """Get full deployment status including devices, flash, and cloud."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get current devices (simulated or real)
    if settings.simulate_hardware:
        device_list = [DeviceInfo(**d.model_dump()) for d in SIMULATED_DEVICES]
        for device in device_list:
            device.assigned_node = session.flash_assignments.get(device.port)
    else:
        flash_manager = FlashManager(BUILDS_DIR / "firmware")
        devices = flash_manager.scan_devices()
        device_list = []
        for d in devices:
            device_list.append(DeviceInfo(
                port=d.port,
                board_type=d.board_type,
                chip_name=d.chip_name,
                vid=d.vid,
                pid=d.pid,
                assigned_node=session.flash_assignments.get(d.port),
            ))

    # Build cloud status
    outputs = None
    if session.terraform_outputs:
        outputs = TerraformOutputs(**session.terraform_outputs)

    cloud_status = CloudStatus(
        status=session.cloud_status,
        step=session.cloud_step,
        message=session.cloud_message,
        progress_percent=session.cloud_progress,
        outputs=outputs,
    )

    # Build flash status
    flash_status = {}
    for port, status in session.flash_status.items():
        if isinstance(status, dict):
            flash_status[port] = FlashProgress(**status)
        else:
            flash_status[port] = status

    return DeployStatusResponse(
        session_id=session_id,
        flash_status=flash_status,
        cloud_status=cloud_status,
        devices=device_list,
        assignments=session.flash_assignments,
    )
