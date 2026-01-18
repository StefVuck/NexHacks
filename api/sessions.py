"""Session management for tracking build/deploy state."""

import asyncio
import uuid
from datetime import datetime
from typing import Optional

from api.models import (
    BuildSessionState,
    BuildSessionStatus,
    BuildSettings,
    NodeBuildState,
    NodeBuildStatus,
    NodeSimulationState,
    SimulationSessionState,
    SimulationStatus,
)


class SessionState:
    """State for a single session, using the new Pydantic models."""

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.created_at = datetime.now()

        # Design
        self.design_id: Optional[str] = None
        self.system_spec: Optional[dict] = None

        # Build - use Pydantic model
        self.build_state = BuildSessionState(
            session_id=session_id,
            status=BuildSessionStatus.IDLE,
            settings=BuildSettings(),
        )
        self.build_task: Optional[asyncio.Task] = None

        # Simulate - use Pydantic model
        self.simulation_state = SimulationSessionState(
            session_id=session_id,
            status=SimulationStatus.IDLE,
        )
        self.simulate_task: Optional[asyncio.Task] = None

        # Deploy - flash
        self.flash_status: dict = {}
        self.flash_assignments: dict[str, str] = {}  # port -> node_id

        # Deploy - cloud
        self.cloud_status: str = "idle"
        self.cloud_step: Optional[str] = None
        self.cloud_progress: int = 0
        self.cloud_message: Optional[str] = None
        self.terraform_outputs: Optional[dict] = None
        self.terraform_task: Optional[asyncio.Task] = None

        # Deploy - settings and telemetry
        self.deploy_settings: Optional[dict] = None
        self.node_telemetry: dict[str, dict] = {}

        # WebSocket connections
        self.websockets: list = []

    # === Build State Helpers ===

    def init_build_nodes(self, nodes: list[dict], settings: BuildSettings):
        """Initialize build state for all nodes."""
        self.build_state.settings = settings
        self.build_state.nodes = {}
        for node in nodes:
            node_id = node["node_id"]
            self.build_state.nodes[node_id] = NodeBuildState(
                node_id=node_id,
                description=node.get("description", ""),
                board_type=settings.board_id,
                status=NodeBuildStatus.PENDING,
                max_iterations=settings.max_iterations,
            )

    def update_node_status(self, node_id: str, status: NodeBuildStatus):
        """Update a node's build status."""
        if node_id in self.build_state.nodes:
            self.build_state.nodes[node_id].status = status
            if status == NodeBuildStatus.SUCCESS:
                self.build_state.nodes[node_id].completed_at = datetime.now()
            elif status == NodeBuildStatus.FAILED:
                self.build_state.nodes[node_id].completed_at = datetime.now()

    def get_node_state(self, node_id: str) -> Optional[NodeBuildState]:
        """Get a node's build state."""
        return self.build_state.nodes.get(node_id)

    # === Simulation State Helpers ===

    def init_simulation_nodes(self, node_ids: list[str]):
        """Initialize simulation state for all nodes."""
        self.simulation_state.nodes = {}
        for node_id in node_ids:
            self.simulation_state.nodes[node_id] = NodeSimulationState(
                node_id=node_id,
                status="offline",
            )

    def update_sim_node_status(self, node_id: str, status: str, readings: dict = None):
        """Update a node's simulation status."""
        if node_id in self.simulation_state.nodes:
            self.simulation_state.nodes[node_id].status = status
            if readings:
                self.simulation_state.nodes[node_id].latest_readings = readings


class SessionManager:
    """Manages all active sessions."""

    def __init__(self):
        self.sessions: dict[str, SessionState] = {}

    def create_session(self, session_id: Optional[str] = None) -> SessionState:
        """Create a new session and return it."""
        if session_id is None:
            session_id = str(uuid.uuid4())
        if session_id not in self.sessions:
            self.sessions[session_id] = SessionState(session_id=session_id)
        return self.sessions[session_id]

    def get_session(self, session_id: str) -> Optional[SessionState]:
        """Get session by ID."""
        return self.sessions.get(session_id)

    def delete_session(self, session_id: str):
        """Delete a session."""
        if session_id in self.sessions:
            session = self.sessions[session_id]
            if session.build_task and not session.build_task.done():
                session.build_task.cancel()
            if session.simulate_task and not session.simulate_task.done():
                session.simulate_task.cancel()
            if session.terraform_task and not session.terraform_task.done():
                session.terraform_task.cancel()
            del self.sessions[session_id]

    def remove_session(self, session_id: str):
        """Alias for delete_session."""
        self.delete_session(session_id)

    def list_sessions(self) -> list[str]:
        """List all session IDs."""
        return list(self.sessions.keys())

    async def broadcast_to_session(self, session_id: str, message: dict):
        """Send message to all WebSocket connections for a session."""
        session = self.get_session(session_id)
        if not session:
            return

        # Remove closed connections
        active_websockets = []
        for ws in session.websockets:
            try:
                # Check if connection is still open
                if hasattr(ws, "client_state"):
                    from starlette.websockets import WebSocketState

                    if ws.client_state == WebSocketState.CONNECTED:
                        active_websockets.append(ws)
                else:
                    active_websockets.append(ws)
            except Exception:
                pass

        session.websockets = active_websockets

        # Broadcast to all active connections
        for ws in session.websockets:
            try:
                await ws.send_json(message)
            except Exception as e:
                print(f"Error broadcasting to WebSocket: {e}")


# Global session manager instance
session_manager = SessionManager()
