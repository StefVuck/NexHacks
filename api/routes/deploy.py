"""Deploy stage API routes."""

import asyncio
from pathlib import Path
from fastapi import APIRouter, HTTPException

from api.sessions import session_manager
from api.models import FlashRequest, CloudDeployRequest, DeployStatusResponse, DeviceInfo

# Import flasher module
from flasher import detect_devices as flasher_detect_devices
from flasher import flash_esp32, flash_stm32
from flasher import DeviceInfo as FlasherDeviceInfo


router = APIRouter()


@router.get("/devices")
async def list_devices() -> list[DeviceInfo]:
    """List connected USB devices using the flasher module."""
    try:
        # Use real flasher detector
        flasher_devices = flasher_detect_devices()
        
        # Convert to API model
        devices = []
        for dev in flasher_devices:
            devices.append(DeviceInfo(
                port=dev.port,
                description=dev.chip_name,
                vid=dev.vid,
                pid=dev.pid,
                board_type=dev.board_type
            ))
        
        return devices
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list devices: {str(e)}")


@router.post("/flash")
async def flash_firmware(request: FlashRequest):
    """Flash firmware to a connected device.
    
    Uses the flasher module to flash ESP32 or STM32 devices.
    """
    session = session_manager.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.build_status != "success":
        raise HTTPException(status_code=400, detail="Build must complete successfully first")
    
    # Get the firmware path from build results
    # For now, we'll need to find the compiled firmware
    # This assumes the GenerationLoop stores the firmware path
    
    # Initialize flash status
    session.flash_status[request.node_id] = {
        "status": "preparing",
        "port": request.port,
        "progress": 0
    }
    
    # Broadcast flash start
    await session_manager.broadcast_to_session(request.session_id, {
        "stage": "deploy",
        "type": "flash_start",
        "data": {
            "node_id": request.node_id,
            "port": request.port
        }
    })
    
    # Start flashing in background
    async def do_flash():
        try:
            session.flash_status[request.node_id]["status"] = "flashing"
            session.flash_status[request.node_id]["progress"] = 10
            
            # Broadcast progress
            await session_manager.broadcast_to_session(request.session_id, {
                "stage": "deploy",
                "type": "flash_progress",
                "data": {
                    "node_id": request.node_id,
                    "percent": 10
                }
            })
            
            # Determine board type from port or session data
            # For now, we'll try to detect from the device
            devices = flasher_detect_devices()
            device = next((d for d in devices if d.port == request.port), None)
            
            if not device:
                raise Exception(f"Device not found on port {request.port}")
            
            # TODO: Get actual firmware path from build results
            # For now, this is a placeholder
            firmware_path = Path(f"/tmp/firmware_{request.node_id}.bin")
            
            if not firmware_path.exists():
                raise Exception(f"Firmware not found for {request.node_id}")
            
            session.flash_status[request.node_id]["progress"] = 30
            await session_manager.broadcast_to_session(request.session_id, {
                "stage": "deploy",
                "type": "flash_progress",
                "data": {"node_id": request.node_id, "percent": 30}
            })
            
            # Flash based on board type
            if device.board_type.startswith("esp32"):
                result = flash_esp32(firmware_path, request.port)
            elif device.board_type == "stm32":
                result = flash_stm32(firmware_path, request.port)
            else:
                raise Exception(f"Unsupported board type: {device.board_type}")
            
            if result.success:
                session.flash_status[request.node_id]["status"] = "complete"
                session.flash_status[request.node_id]["progress"] = 100
                
                await session_manager.broadcast_to_session(request.session_id, {
                    "stage": "deploy",
                    "type": "flash_complete",
                    "data": {
                        "node_id": request.node_id,
                        "output": result.output
                    }
                })
            else:
                session.flash_status[request.node_id]["status"] = "error"
                session.flash_status[request.node_id]["error"] = result.error
                
                await session_manager.broadcast_to_session(request.session_id, {
                    "stage": "deploy",
                    "type": "flash_error",
                    "data": {
                        "node_id": request.node_id,
                        "error": result.error
                    }
                })
        
        except Exception as e:
            session.flash_status[request.node_id]["status"] = "error"
            session.flash_status[request.node_id]["error"] = str(e)
            
            await session_manager.broadcast_to_session(request.session_id, {
                "stage": "deploy",
                "type": "flash_error",
                "data": {
                    "node_id": request.node_id,
                    "error": str(e)
                }
            })
    
    # Start background task
    asyncio.create_task(do_flash())
    
    return {
        "status": "started",
        "message": f"Flashing {request.node_id} to {request.port}"
    }


@router.post("/cloud")
async def deploy_cloud(request: CloudDeployRequest):
    """Deploy aggregation server to cloud using Terraform.
    
    TODO: Integrate with infra/ Terraform configs
    """
    session = session_manager.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # TODO: Run terraform apply
    # For now, return placeholder
    
    session.cloud_status = {
        "status": "deploying",
        "swarm_id": request.swarm_id,
        "region": request.region
    }
    
    return {
        "status": "started",
        "message": f"Deploying to {request.region}"
    }


@router.delete("/cloud")
async def destroy_cloud(session_id: str):
    """Destroy cloud resources using Terraform.
    
    TODO: Run terraform destroy
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.cloud_status = {
        "status": "destroying"
    }
    
    return {
        "status": "started",
        "message": "Destroying cloud resources"
    }


@router.get("/status")
async def get_deploy_status(session_id: str) -> DeployStatusResponse:
    """Get deployment status."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return DeployStatusResponse(
        session_id=session_id,
        flash_status=session.flash_status,
        cloud_status=session.cloud_status
    )
