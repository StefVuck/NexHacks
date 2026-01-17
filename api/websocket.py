"""WebSocket handler for real-time updates."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from api.sessions import session_manager


router = APIRouter()


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time updates.
    
    Clients connect to this endpoint to receive live updates during:
    - Build: iteration progress, compilation results, test results
    - Simulate: simulation output, node status
    - Deploy: flash progress, terraform status
    """
    await websocket.accept()
    
    # Get or create session
    session = session_manager.get_session(session_id)
    if not session:
        # Create session if it doesn't exist
        session_manager.sessions[session_id] = session_manager.create_session()
        session = session_manager.get_session(session_id)
    
    # Add WebSocket to session
    session.websockets.append(websocket)
    
    try:
        # Send initial connection message
        await websocket.send_json({
            "type": "connected",
            "session_id": session_id,
            "message": "WebSocket connected"
        })
        
        # Keep connection alive and handle incoming messages
        while True:
            data = await websocket.receive_json()
            
            # Handle ping/pong for keep-alive
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            
            # Could handle other client messages here
            
    except WebSocketDisconnect:
        # Remove WebSocket from session
        if session and websocket in session.websockets:
            session.websockets.remove(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        if session and websocket in session.websockets:
            session.websockets.remove(websocket)
