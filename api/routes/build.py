"""Build stage API routes."""

import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from agent import GenerationLoop, SystemSpec, NodeSpec, TestAssertion
from api.sessions import session_manager
from api.models import BuildStartRequest, BuildStatusResponse


router = APIRouter()


class BuildRequest(BaseModel):
    """Request to start a build."""
    description: str
    board_id: str = "lm3s6965"
    nodes: list[dict]  # List of {node_id, description, assertions}


@router.post("/start")
async def start_build(request: BuildRequest):
    """Start the firmware generation loop."""
    # Create new session
    session_id = session_manager.create_session()
    session = session_manager.get_session(session_id)
    
    # Convert request to SystemSpec
    nodes = []
    for node_data in request.nodes:
        assertions = [
            TestAssertion(
                name=a.get("name", "test"),
                pattern=a.get("pattern", ""),
                required=a.get("required", True)
            )
            for a in node_data.get("assertions", [])
        ]
        nodes.append(NodeSpec(
            node_id=node_data["node_id"],
            description=node_data["description"],
            assertions=assertions
        ))
    
    spec = SystemSpec(
        description=request.description,
        board_id=request.board_id,
        nodes=nodes
    )
    
    # Store spec in session
    session.system_spec = {
        "description": spec.description,
        "board_id": spec.board_id,
        "nodes": [
            {
                "node_id": n.node_id,
                "description": n.description,
                "assertions": [{"name": a.name, "pattern": a.pattern} for a in n.assertions]
            }
            for n in spec.nodes
        ]
    }
    
    # Start build in background
    async def run_build():
        session.build_status = "running"
        
        def on_progress(node_id: str, iteration: int, status: str):
            session.current_node = node_id
            session.current_iteration = iteration
            
            # Broadcast progress via WebSocket
            asyncio.create_task(session_manager.broadcast_to_session(session_id, {
                "stage": "build",
                "type": "iteration_update",
                "data": {
                    "node_id": node_id,
                    "iteration": iteration,
                    "status": status
                }
            }))
        
        try:
            loop = GenerationLoop()
            results = await loop.run(spec, on_progress=on_progress)
            
            # Store results
            session.build_results = {
                node_id: [
                    {
                        "iteration": r.iteration,
                        "success": r.success,
                        "compiled": r.compilation.success,
                        "simulated": r.simulation.success if r.simulation else False,
                        "tests_passed": all(t.passed for t in r.test_results) if r.test_results else False,
                    }
                    for r in iterations
                ]
                for node_id, iterations in results.items()
            }
            
            session.build_status = "success"
            
            # Broadcast completion
            await session_manager.broadcast_to_session(session_id, {
                "stage": "build",
                "type": "complete",
                "data": {"success": True, "results": session.build_results}
            })
            
            loop.cleanup()
            
        except Exception as e:
            print(f"❌ Build error: {e}")
            import traceback
            traceback.print_exc()
            session.build_status = "failed"
            await session_manager.broadcast_to_session(session_id, {
                "stage": "build",
                "type": "error",
                "data": {"message": str(e)}
            })
    
    # Start task
    session.build_task = asyncio.create_task(run_build())
    
    return {
        "session_id": session_id,
        "status": "started",
        "message": f"Building firmware for {len(nodes)} node(s)"
    }


@router.get("/{session_id}/status")
async def get_build_status(session_id: str) -> BuildStatusResponse:
    """Get current build status."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return BuildStatusResponse(
        session_id=session_id,
        status=session.build_status,
        current_node=session.current_node,
        current_iteration=session.current_iteration,
        results=session.build_results
    )


@router.post("/{session_id}/stop")
async def stop_build(session_id: str):
    """Cancel a running build."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.build_task and not session.build_task.done():
        session.build_task.cancel()
        session.build_status = "idle"
        return {"status": "cancelled"}
    
    return {"status": "not_running"}
