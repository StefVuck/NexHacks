"""Pydantic models for API requests and responses."""

from typing import Optional
from pydantic import BaseModel, Field


# Design Stage Models
class DesignParseRequest(BaseModel):
    """Request to parse natural language into system spec."""
    prompt: str = Field(..., description="Natural language description of the system")
    board_id: str = Field(default="lm3s6965", description="Target board ID")


class NodePosition(BaseModel):
    """Position of a node on the canvas."""
    x: float
    y: float


class NodePlacement(BaseModel):
    """Node with position and configuration."""
    node_id: str
    description: str
    board_id: str = "lm3s6965"
    position: Optional[NodePosition] = None
    assertions: list[dict] = Field(default_factory=list)


class SystemDesign(BaseModel):
    """Complete system design with nodes and layout."""
    design_id: str
    description: str
    nodes: list[NodePlacement]
    created_at: str


# Build Stage Models
class BuildStartRequest(BaseModel):
    """Request to start build process."""
    design_id: Optional[str] = None
    spec: Optional[dict] = None  # SystemSpec as dict


class BuildStatusResponse(BaseModel):
    """Build status for a session."""
    session_id: str
    status: str  # "running" | "success" | "failed" | "idle"
    current_node: Optional[str] = None
    current_iteration: int = 0
    results: dict = Field(default_factory=dict)


# Simulate Stage Models
class SimulateStartRequest(BaseModel):
    """Request to start simulation."""
    session_id: str
    timeout_seconds: float = 30.0


class SimulateStatusResponse(BaseModel):
    """Simulation status."""
    session_id: str
    status: str  # "running" | "stopped" | "idle"
    nodes: dict = Field(default_factory=dict)


# Deploy Stage Models
class DeviceInfo(BaseModel):
    """Connected USB device information."""
    port: str
    description: str
    vid: Optional[str] = None
    pid: Optional[str] = None
    board_type: Optional[str] = None


class FlashRequest(BaseModel):
    """Request to flash firmware to device."""
    session_id: str
    node_id: str
    port: str


class CloudDeployRequest(BaseModel):
    """Request to deploy aggregation server to cloud."""
    session_id: str
    swarm_id: str
    region: str = "us-east-1"
    instance_type: str = "t3.micro"


class DeployStatusResponse(BaseModel):
    """Deployment status."""
    session_id: str
    flash_status: dict = Field(default_factory=dict)
    cloud_status: Optional[dict] = None


# WebSocket Event Models
class WSEvent(BaseModel):
    """WebSocket event."""
    stage: str  # "build" | "simulate" | "deploy"
    type: str
    data: dict = Field(default_factory=dict)
