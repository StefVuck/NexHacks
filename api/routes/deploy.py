"""Deploy stage API routes - Cloud provisioning and hardware flashing."""

import asyncio
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from api.sessions import session_manager
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

@router.get("/devices", response_model=list[DeviceInfo])
async def list_devices(session_id: Optional[str] = Query(None)):
    """
    List connected USB devices.

    If session_id is provided, includes node assignments for that session.
    """
    flash_manager = FlashManager(BUILDS_DIR / "firmware")
    devices = flash_manager.scan_devices()

    # Add session-specific assignments
    if session_id:
        session = session_manager.get_session(session_id)
        if session:
            for device in devices:
                device.assigned_node = session.flash_assignments.get(device.port)

    return [
        DeviceInfo(
            port=d.port,
            board_type=d.board_type,
            chip_name=d.chip_name,
            vid=d.vid,
            pid=d.pid,
            assigned_node=d.assigned_node,
        )
        for d in devices
    ]


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
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.build_status != "success":
        raise HTTPException(status_code=400, detail="Build must complete successfully first")

    # Progress callback to broadcast via WebSocket
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

    # Start flashing in background
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

    if session.build_status != "success":
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
    """
    runner = TerraformRunner(INFRA_DIR, TERRAFORM_WORKING_DIR)

    terraform_installed = await runner.check_installed()
    aws_configured = await runner.check_aws_credentials()

    return {
        "terraform_installed": terraform_installed,
        "aws_configured": aws_configured,
        "ready": terraform_installed and aws_configured,
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
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.cloud_status in ["applying", "initializing", "planning"]:
        raise HTTPException(status_code=400, detail="Deployment already in progress")

    # Check prerequisites
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
    Simulate telemetry data for testing.

    This generates fake sensor readings and broadcasts them via WebSocket.
    """
    import random

    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not session.system_spec:
        raise HTTPException(status_code=400, detail="No system spec available")

    # Generate fake telemetry for each node
    nodes = session.system_spec.get("nodes", [])
    for node in nodes:
        node_id = node.get("node_id", node.get("id", "unknown"))

        # Random readings
        readings = {
            "temperature": round(20 + random.random() * 15, 1),
            "humidity": round(40 + random.random() * 40, 1),
        }

        # Check for alerts
        alerts = []
        if readings["temperature"] > 30:
            alerts.append(f"High temperature: {readings['temperature']}°C")

        telemetry = {
            "online": random.random() > 0.1,  # 90% chance online
            "last_seen": datetime.now().isoformat(),
            "readings": readings,
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

    return {"status": "simulated", "nodes": len(nodes)}


# ============================================================================
# Full Status
# ============================================================================

@router.get("/{session_id}/status")
async def get_deploy_status(session_id: str) -> DeployStatusResponse:
    """Get full deployment status including devices, flash, and cloud."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get current devices
    flash_manager = FlashManager(BUILDS_DIR / "firmware")
    devices = flash_manager.scan_devices()

    # Add assignments
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
