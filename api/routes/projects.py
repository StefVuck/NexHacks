"""Project management API routes."""

from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.projects import project_store, Project, ProjectStage, ProjectSpec
from api.sessions import session_manager

router = APIRouter()


class CreateProjectRequest(BaseModel):
    name: str
    description: Optional[str] = None


class UpdateProjectRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    current_stage: Optional[ProjectStage] = None


class SaveSpecRequest(BaseModel):
    prompt: Optional[str] = None
    nodes: list[dict] = []
    connections: list[dict] = []


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    created_at: str
    updated_at: str
    current_stage: ProjectStage
    design_complete: bool
    build_complete: bool
    simulate_complete: bool
    deploy_complete: bool
    spec: ProjectSpec
    cloud_status: str
    terraform_outputs: Optional[dict]


@router.get("", response_model=list[ProjectResponse])
async def list_projects():
    """List all projects."""
    return project_store.list_all()


@router.post("", response_model=ProjectResponse)
async def create_project(request: CreateProjectRequest):
    """Create a new project."""
    project = project_store.create(name=request.name, description=request.description)

    # Create a session for this project
    session_manager.create_session(project.id)

    return project


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    """Get a project by ID."""
    project = project_store.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, request: UpdateProjectRequest):
    """Update a project."""
    updates = request.model_dump(exclude_unset=True)
    project = project_store.update(project_id, **updates)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """Delete a project."""
    # Clean up session if exists
    session_manager.remove_session(project_id)

    if not project_store.delete(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "deleted", "project_id": project_id}


@router.post("/{project_id}/spec", response_model=ProjectResponse)
async def save_project_spec(project_id: str, request: SaveSpecRequest):
    """Save the project's system specification (from design stage)."""
    spec = ProjectSpec(
        prompt=request.prompt,
        nodes=request.nodes,
        connections=request.connections,
    )
    project = project_store.save_spec(project_id, spec)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Also update session system_spec
    session = session_manager.get_session(project_id)
    if session:
        session.system_spec = spec.model_dump()

    return project


@router.post("/{project_id}/stage/{stage}", response_model=ProjectResponse)
async def update_project_stage(project_id: str, stage: ProjectStage):
    """Update project's current stage."""
    project = project_store.update_stage(project_id, stage)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/{project_id}/stage/{stage}/complete", response_model=ProjectResponse)
async def mark_stage_complete(project_id: str, stage: ProjectStage):
    """Mark a stage as complete."""
    project = project_store.mark_stage_complete(project_id, stage)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/{project_id}/session")
async def get_or_create_session(project_id: str):
    """Get or create a session for a project."""
    project = project_store.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    session = session_manager.get_session(project_id)
    if not session:
        session = session_manager.create_session(project_id)

    # Restore project state to session
    if project.spec:
        session.system_spec = project.spec.model_dump()
    if project.build_results:
        # Restore build state if available
        pass

    return {
        "session_id": project_id,
        "project_id": project_id,
        "project_name": project.name,
        "current_stage": project.current_stage,
    }
