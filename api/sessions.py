"""Session management for tracking build/deploy state."""

import asyncio
from datetime import datetime
from typing import Optional
from dataclasses import dataclass, field
import uuid


@dataclass
class SessionState:
    """State for a single session."""
    session_id: str
    created_at: datetime = field(default_factory=datetime.now)
    
    # Design
    design_id: Optional[str] = None
    system_spec: Optional[dict] = None
    
    # Build
    build_status: str = "idle"  # "idle" | "running" | "success" | "failed"
    current_node: Optional[str] = None
    current_iteration: int = 0
    build_results: dict = field(default_factory=dict)
    build_task: Optional[asyncio.Task] = None
    
    # Simulate
    simulate_status: str = "idle"  # "idle" | "running" | "stopped"
    simulate_results: dict = field(default_factory=dict)
    simulate_task: Optional[asyncio.Task] = None
    
    # Deploy
    flash_status: dict = field(default_factory=dict)
    cloud_status: Optional[dict] = None
    terraform_outputs: Optional[dict] = None
    
    # WebSocket connections
    websockets: list = field(default_factory=list)


class SessionManager:
    """Manages all active sessions."""
    
    def __init__(self):
        self.sessions: dict[str, SessionState] = {}
    
    def create_session(self) -> str:
        """Create a new session and return its ID."""
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = SessionState(session_id=session_id)
        return session_id
    
    def get_session(self, session_id: str) -> Optional[SessionState]:
        """Get session by ID."""
        return self.sessions.get(session_id)
    
    def delete_session(self, session_id: str):
        """Delete a session."""
        if session_id in self.sessions:
            # Cancel any running tasks
            session = self.sessions[session_id]
            if session.build_task and not session.build_task.done():
                session.build_task.cancel()
            if session.simulate_task and not session.simulate_task.done():
                session.simulate_task.cancel()
            
            del self.sessions[session_id]
    
    def list_sessions(self) -> list[str]:
        """List all session IDs."""
        return list(self.sessions.keys())
    
    async def broadcast_to_session(self, session_id: str, message: dict):
        """Send message to all WebSocket connections for a session."""
        session = self.get_session(session_id)
        if not session:
            return
        
        # Remove closed connections
        session.websockets = [ws for ws in session.websockets if not ws.client_state.DISCONNECTED]
        
        # Broadcast to all active connections
        for ws in session.websockets:
            try:
                await ws.send_json(message)
            except Exception as e:
                print(f"Error broadcasting to WebSocket: {e}")


# Global session manager instance
session_manager = SessionManager()
