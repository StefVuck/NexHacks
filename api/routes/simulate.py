"""Simulate stage API routes."""

from fastapi import APIRouter, HTTPException

from api.sessions import session_manager
from api.models import SimulateStartRequest, SimulateStatusResponse


router = APIRouter()


@router.post("/start")
async def start_simulation(request: SimulateStartRequest):
    """Start simulation of built firmware.
    
    Note: Simulation is already done during the build stage.
    This endpoint is for re-running or extended simulation.
    """
    session = session_manager.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.build_status != "success":
        raise HTTPException(status_code=400, detail="Build must complete successfully first")
    
    session.simulate_status = "running"
    
    # In the current implementation, simulation happens during build
    # This endpoint could be extended to run longer simulations or re-run
    
    return {
        "status": "running",
        "message": "Simulation already completed during build stage"
    }


@router.post("/stop")
async def stop_simulation(session_id: str):
    """Stop a running simulation."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.simulate_status = "stopped"
    
    return {"status": "stopped"}


@router.get("/status")
async def get_simulation_status(session_id: str) -> SimulateStatusResponse:
    """Get simulation status."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return SimulateStatusResponse(
        session_id=session_id,
        status=session.simulate_status,
        nodes=session.simulate_results
    )
