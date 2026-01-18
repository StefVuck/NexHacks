"""Project management with JSON file persistence."""

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum


class ProjectStage(str, Enum):
    DESIGN = "design"
    BUILD = "build"
    SIMULATE = "simulate"
    DEPLOY = "deploy"


class ProjectSpec(BaseModel):
    """System specification stored with project."""
    prompt: Optional[str] = None
    nodes: list[dict] = Field(default_factory=list)
    connections: list[dict] = Field(default_factory=list)


class Project(BaseModel):
    """Project model."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    current_stage: ProjectStage = ProjectStage.DESIGN
    spec: ProjectSpec = Field(default_factory=ProjectSpec)

    # Stage completion flags
    design_complete: bool = False
    build_complete: bool = False
    simulate_complete: bool = False
    deploy_complete: bool = False

    # Build results (stored for resumption)
    build_results: Optional[dict] = None

    # Cloud status
    cloud_status: str = "idle"
    terraform_outputs: Optional[dict] = None


class ProjectStore:
    """JSON file-based project storage."""

    def __init__(self, storage_dir: Path):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.projects_file = self.storage_dir / "projects.json"
        self._projects: dict[str, Project] = {}
        self._load()

    def _load(self):
        """Load projects from disk."""
        if self.projects_file.exists():
            try:
                data = json.loads(self.projects_file.read_text())
                self._projects = {
                    pid: Project(**pdata)
                    for pid, pdata in data.items()
                }
            except (json.JSONDecodeError, Exception) as e:
                print(f"Error loading projects: {e}")
                self._projects = {}

    def _save(self):
        """Save projects to disk."""
        data = {
            pid: proj.model_dump()
            for pid, proj in self._projects.items()
        }
        self.projects_file.write_text(json.dumps(data, indent=2, default=str))

    def create(self, name: str, description: Optional[str] = None) -> Project:
        """Create a new project."""
        project = Project(name=name, description=description)
        self._projects[project.id] = project
        self._save()
        return project

    def get(self, project_id: str) -> Optional[Project]:
        """Get a project by ID."""
        return self._projects.get(project_id)

    def list_all(self) -> list[Project]:
        """List all projects, sorted by updated_at descending."""
        projects = list(self._projects.values())
        projects.sort(key=lambda p: p.updated_at, reverse=True)
        return projects

    def update(self, project_id: str, **kwargs) -> Optional[Project]:
        """Update a project."""
        project = self._projects.get(project_id)
        if not project:
            return None

        for key, value in kwargs.items():
            if hasattr(project, key):
                setattr(project, key, value)

        project.updated_at = datetime.now().isoformat()
        self._save()
        return project

    def delete(self, project_id: str) -> bool:
        """Delete a project."""
        if project_id in self._projects:
            del self._projects[project_id]
            self._save()
            return True
        return False

    def update_stage(self, project_id: str, stage: ProjectStage) -> Optional[Project]:
        """Update project's current stage."""
        return self.update(project_id, current_stage=stage)

    def mark_stage_complete(self, project_id: str, stage: ProjectStage) -> Optional[Project]:
        """Mark a stage as complete."""
        stage_field = f"{stage.value}_complete"
        return self.update(project_id, **{stage_field: True})

    def save_spec(self, project_id: str, spec: ProjectSpec) -> Optional[Project]:
        """Save the system specification."""
        return self.update(project_id, spec=spec, design_complete=True)

    def save_build_results(self, project_id: str, results: dict) -> Optional[Project]:
        """Save build results."""
        return self.update(project_id, build_results=results, build_complete=True)


# Global project store instance
PROJECT_STORAGE_DIR = Path(__file__).parent.parent / "data" / "projects"
project_store = ProjectStore(PROJECT_STORAGE_DIR)
