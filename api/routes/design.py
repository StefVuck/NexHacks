"""Design stage API routes."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid
from datetime import datetime

from api.models import DesignParseRequest, SystemDesign, NodePlacement
from api.sessions import session_manager


router = APIRouter()


# In-memory storage for designs (could be replaced with database)
designs_db: dict[str, SystemDesign] = {}


@router.post("/parse")
async def parse_design(request: DesignParseRequest):
    """Parse natural language prompt into system spec.
    
    This is a simplified version - in production, you'd use Claude to parse the prompt.
    """
    # For now, return a simple parsed design
    # TODO: Use Claude API to intelligently parse the prompt
    
    design_id = str(uuid.uuid4())
    
    # Simple heuristic: look for keywords like "sensor", "monitor", etc.
    description = request.prompt
    
    # Create a basic design
    design = SystemDesign(
        design_id=design_id,
        description=description,
        nodes=[
            NodePlacement(
                node_id="node_1",
                description=f"Node based on: {description[:100]}",
                board_id=request.board_id,
                position={"x": 100, "y": 100},
                assertions=[
                    {"name": "basic_output", "pattern": "ready"}
                ]
            )
        ],
        created_at=datetime.now().isoformat()
    )
    
    designs_db[design_id] = design
    
    return design


@router.post("/suggest")
async def suggest_layout(request: dict):
    """LLM suggests device placement based on description.
    
    TODO: Implement intelligent layout suggestion using Claude.
    """
    return {
        "message": "Layout suggestion not yet implemented",
        "suggested_nodes": []
    }


@router.post("/save")
async def save_design(design: SystemDesign):
    """Save a design."""
    designs_db[design.design_id] = design
    return {"status": "saved", "design_id": design.design_id}


@router.get("/{design_id}")
async def get_design(design_id: str) -> SystemDesign:
    """Get a saved design."""
    if design_id not in designs_db:
        raise HTTPException(status_code=404, detail="Design not found")
    return designs_db[design_id]


@router.get("/")
async def list_designs():
    """List all designs."""
    return {"designs": list(designs_db.values())}
