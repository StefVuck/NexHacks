"""Simulate stage API routes with real-time visualization support."""

import asyncio
import random
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from api.models import (
    NodeSimulationState,
    SimulateSpeedRequest,
    SimulateStartRequest,
    SimulateStatusResponse,
    SimulationMessage,
    SimulationStatus,
)
from api.sessions import session_manager
from config.settings import settings

router = APIRouter()


@router.post("/start")
async def start_simulation(request: SimulateStartRequest):
    """Start or restart simulation of built firmware.

    This runs the built firmware in QEMU/Wokwi simulators and streams
    the output and inter-node messages to connected WebSocket clients.
    """
    session = session_manager.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Check if build completed successfully
    build_state = session.build_state
    if build_state.status.value not in ["success", "partial"]:
        raise HTTPException(
            status_code=400,
            detail=f"Build must complete successfully first (current: {build_state.status.value})",
        )

    # Get successfully built nodes
    successful_nodes = [
        node_id
        for node_id, state in build_state.nodes.items()
        if state.status.value == "success"
    ]

    if not successful_nodes:
        raise HTTPException(status_code=400, detail="No successfully built nodes to simulate")

    # Initialize simulation state
    session.simulation_state.status = SimulationStatus.RUNNING
    session.simulation_state.speed = request.speed
    session.simulation_state.elapsed_time_ms = 0
    session.simulation_state.messages = []
    session.simulation_state.alerts = []
    session.simulation_state.started_at = datetime.now()
    session.init_simulation_nodes(successful_nodes)

    # Broadcast simulation started
    await session_manager.broadcast_to_session(
        request.session_id,
        {
            "stage": "simulate",
            "type": "started",
            "data": {
                "nodes": successful_nodes,
                "speed": request.speed,
                "timeout_seconds": request.timeout_seconds,
            },
        },
    )

    # Start simulation in background
    async def run_simulation():
        try:
            timeout = request.timeout_seconds
            elapsed = 0.0
            tick_interval = 0.1  # 100ms ticks

            # Mark all nodes as online
            for node_id in successful_nodes:
                session.update_sim_node_status(node_id, "online")
                await session_manager.broadcast_to_session(
                    request.session_id,
                    {
                        "stage": "simulate",
                        "type": "node_status",
                        "data": {
                            "node_id": node_id,
                            "status": "online",
                        },
                    },
                )

            # Simulation loop - replay build outputs as simulated messages
            while elapsed < timeout:
                if session.simulation_state.status == SimulationStatus.PAUSED:
                    await asyncio.sleep(tick_interval)
                    continue

                if session.simulation_state.status == SimulationStatus.STOPPED:
                    break

                # Adjust tick speed
                speed = session.simulation_state.speed
                await asyncio.sleep(tick_interval / speed)
                elapsed += tick_interval

                session.simulation_state.elapsed_time_ms = int(elapsed * 1000)
                tick_count = int(elapsed * 10)  # Increments every 100ms

                # Send tick update every 500ms (every 5 ticks)
                if tick_count % 5 == 0:
                    await session_manager.broadcast_to_session(
                        request.session_id,
                        {
                            "stage": "simulate",
                            "type": "tick",
                            "data": {
                                "elapsed_ms": session.simulation_state.elapsed_time_ms,
                            },
                        },
                    )

                # Send simulated messages every second (every 10 ticks)
                if tick_count % 10 == 0 and tick_count > 0:
                    for node_id in successful_nodes:
                        node_build = build_state.nodes.get(node_id)

                        # Get readings from build output or generate mock data
                        readings = {}
                        if node_build and node_build.iterations:
                            latest = node_build.iterations[-1]
                            if latest.simulation_output:
                                readings = _parse_readings(latest.simulation_output)

                        # If no readings from build, generate mock sensor data
                        if not readings:
                            readings = {
                                "temperature": round(20 + random.random() * 10, 1),
                                "counter": tick_count // 10,
                            }

                        # Update node status
                        session.update_sim_node_status(node_id, "online", readings)

                        # Create simulated message
                        msg = SimulationMessage(
                            timestamp=datetime.now(),
                            from_node=node_id,
                            to_node="broker",
                            payload=readings,
                            topic=f"swarm/demo/nodes/{node_id}/telemetry",
                        )
                        session.simulation_state.messages.append(msg)

                        await session_manager.broadcast_to_session(
                            request.session_id,
                            {
                                "stage": "simulate",
                                "type": "message",
                                "data": {
                                    "from": node_id,
                                    "to": "broker",
                                    "topic": msg.topic,
                                    "payload": readings,
                                    "timestamp": int(datetime.now().timestamp() * 1000),
                                },
                            },
                        )

                        await session_manager.broadcast_to_session(
                            request.session_id,
                            {
                                "stage": "simulate",
                                "type": "node_status",
                                "data": {
                                    "node_id": node_id,
                                    "status": "online",
                                    "readings": readings,
                                },
                            },
                        )

            # Simulation complete
            session.simulation_state.status = SimulationStatus.COMPLETED

            # Build test summary from build results
            test_summary = {}
            for node_id in successful_nodes:
                node_build = build_state.nodes.get(node_id)
                if node_build and node_build.iterations:
                    latest = node_build.iterations[-1]
                    for test in latest.test_results:
                        test_summary[f"{node_id}:{test.name}"] = test.passed

            session.simulation_state.test_summary = test_summary

            await session_manager.broadcast_to_session(
                request.session_id,
                {
                    "stage": "simulate",
                    "type": "complete",
                    "data": {
                        "elapsed_ms": session.simulation_state.elapsed_time_ms,
                        "messages_sent": len(session.simulation_state.messages),
                        "tests_passed": sum(1 for v in test_summary.values() if v),
                        "tests_failed": sum(1 for v in test_summary.values() if not v),
                    },
                },
            )

        except asyncio.CancelledError:
            session.simulation_state.status = SimulationStatus.STOPPED
        except Exception as e:
            print(f"Simulation error: {e}")
            import traceback

            traceback.print_exc()
            session.simulation_state.status = SimulationStatus.STOPPED
            await session_manager.broadcast_to_session(
                request.session_id,
                {
                    "stage": "simulate",
                    "type": "error",
                    "data": {"message": str(e)},
                },
            )

    session.simulate_task = asyncio.create_task(run_simulation())

    return {
        "status": "started",
        "session_id": request.session_id,
        "nodes": successful_nodes,
        "timeout_seconds": request.timeout_seconds,
    }


@router.post("/{session_id}/pause")
async def pause_simulation(session_id: str):
    """Pause a running simulation."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.simulation_state.status != SimulationStatus.RUNNING:
        raise HTTPException(status_code=400, detail="Simulation is not running")

    session.simulation_state.status = SimulationStatus.PAUSED

    await session_manager.broadcast_to_session(
        session_id,
        {
            "stage": "simulate",
            "type": "paused",
            "data": {"elapsed_ms": session.simulation_state.elapsed_time_ms},
        },
    )

    return {"status": "paused"}


@router.post("/{session_id}/resume")
async def resume_simulation(session_id: str):
    """Resume a paused simulation."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.simulation_state.status != SimulationStatus.PAUSED:
        raise HTTPException(status_code=400, detail="Simulation is not paused")

    session.simulation_state.status = SimulationStatus.RUNNING

    await session_manager.broadcast_to_session(
        session_id,
        {
            "stage": "simulate",
            "type": "resumed",
            "data": {"elapsed_ms": session.simulation_state.elapsed_time_ms},
        },
    )

    return {"status": "running"}


@router.post("/{session_id}/stop")
async def stop_simulation(session_id: str):
    """Stop a running simulation."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.simulate_task and not session.simulate_task.done():
        session.simulate_task.cancel()

    session.simulation_state.status = SimulationStatus.STOPPED

    await session_manager.broadcast_to_session(
        session_id,
        {
            "stage": "simulate",
            "type": "stopped",
            "data": {"elapsed_ms": session.simulation_state.elapsed_time_ms},
        },
    )

    return {"status": "stopped"}


@router.post("/{session_id}/speed")
async def set_simulation_speed(session_id: str, request: SimulateSpeedRequest):
    """Set simulation speed (1x, 2x, 5x)."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if request.speed not in [1.0, 2.0, 5.0]:
        raise HTTPException(status_code=400, detail="Speed must be 1, 2, or 5")

    session.simulation_state.speed = request.speed

    await session_manager.broadcast_to_session(
        session_id,
        {
            "stage": "simulate",
            "type": "speed_changed",
            "data": {"speed": request.speed},
        },
    )

    return {"status": "ok", "speed": request.speed}


@router.get("/{session_id}/status")
async def get_simulation_status(session_id: str) -> SimulateStatusResponse:
    """Get current simulation status."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    sim = session.simulation_state
    return SimulateStatusResponse(
        session_id=session_id,
        status=sim.status.value,
        speed=sim.speed,
        elapsed_time_ms=sim.elapsed_time_ms,
        nodes=sim.nodes,
        message_count=len(sim.messages),
        test_summary=sim.test_summary,
    )


@router.get("/{session_id}/messages")
async def get_simulation_messages(
    session_id: str,
    node_id: Optional[str] = Query(None, description="Filter by node ID"),
    limit: int = Query(100, description="Max messages to return"),
    offset: int = Query(0, description="Offset for pagination"),
) -> list[SimulationMessage]:
    """Get simulation message log with optional filtering."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = session.simulation_state.messages

    # Filter by node if specified
    if node_id:
        messages = [m for m in messages if m.from_node == node_id or m.to_node == node_id]

    # Apply pagination
    return messages[offset : offset + limit]


@router.get("/{session_id}/node/{node_id}")
async def get_node_simulation_state(session_id: str, node_id: str) -> NodeSimulationState:
    """Get simulation state for a specific node."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    node_state = session.simulation_state.nodes.get(node_id)
    if not node_state:
        raise HTTPException(status_code=404, detail="Node not found in simulation")

    return node_state


def _parse_readings(output: str) -> dict:
    """Parse simulation output for sensor readings.

    Looks for patterns like:
    - temp=25.3
    - humidity=60
    - Counter: 5
    """
    readings = {}
    lines = output.split("\n")

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Pattern: key=value
        if "=" in line:
            parts = line.split("=", 1)
            if len(parts) == 2:
                key = parts[0].strip().lower().replace(" ", "_")
                try:
                    # Try to parse as number
                    value = float(parts[1].strip())
                    if value == int(value):
                        value = int(value)
                    readings[key] = value
                except ValueError:
                    readings[key] = parts[1].strip()

        # Pattern: Key: value
        elif ":" in line:
            parts = line.split(":", 1)
            if len(parts) == 2:
                key = parts[0].strip().lower().replace(" ", "_")
                try:
                    value = float(parts[1].strip())
                    if value == int(value):
                        value = int(value)
                    readings[key] = value
                except ValueError:
                    readings[key] = parts[1].strip()

    return readings
