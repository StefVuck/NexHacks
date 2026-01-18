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
    board_type: str
    chip_name: str
    vid: str
    pid: str
    assigned_node: Optional[str] = None


class NodeAssignment(BaseModel):
    """Assignment of a node to a device port."""
    node_id: str
    port: str
    firmware_path: Optional[str] = None


class FlashRequest(BaseModel):
    """Request to flash firmware to device."""
    node_id: str
    port: str


class FlashAllRequest(BaseModel):
    """Request to flash multiple devices."""
    assignments: list[NodeAssignment]


class FlashProgress(BaseModel):
    """Progress of a flash operation."""
    port: str
    node_id: str
    status: str  # "idle" | "preparing" | "erasing" | "writing" | "verifying" | "complete" | "error"
    percent: int = 0
    stage: str = ""
    message: Optional[str] = None
    error: Optional[str] = None


class CloudDeployRequest(BaseModel):
    """Request to deploy aggregation server to cloud."""
    swarm_id: str
    region: str = "us-east-1"
    instance_type: str = "t3.micro"
    mqtt_port: int = 1883
    http_port: int = 8080
    auto_destroy_hours: int = 2


class TerraformOutputs(BaseModel):
    """Terraform deployment outputs."""
    server_ip: str = ""
    server_url: str = ""
    mqtt_broker: str = ""
    mqtt_port: int = 1883
    mqtt_ws_url: str = ""
    ssh_command: str = ""
    instance_id: str = ""
    swarm_id: str = ""


class CloudStatus(BaseModel):
    """Cloud deployment status."""
    status: str  # "idle" | "initializing" | "planning" | "applying" | "deployed" | "destroying" | "destroyed" | "error"
    step: Optional[str] = None
    message: Optional[str] = None
    progress_percent: int = 0
    outputs: Optional[TerraformOutputs] = None


class DeployStatusResponse(BaseModel):
    """Full deployment status."""
    session_id: str
    flash_status: dict[str, FlashProgress] = Field(default_factory=dict)
    cloud_status: CloudStatus = Field(default_factory=lambda: CloudStatus(status="idle"))
    devices: list[DeviceInfo] = Field(default_factory=list)
    assignments: dict[str, str] = Field(default_factory=dict)


class DeploySettingsRequest(BaseModel):
    """Deploy settings from frontend."""
    # Network settings
    wifi_ssid: Optional[str] = None
    wifi_password: Optional[str] = None
    mqtt_broker_override: Optional[str] = None

    # Cloud settings
    aws_region: str = "us-east-1"
    instance_type: str = "t3.micro"
    auto_destroy_hours: int = 2

    # Hardware settings
    auto_scan_enabled: bool = True
    scan_interval_ms: int = 2000


class NodeTelemetry(BaseModel):
    """Telemetry data from a deployed node."""
    node_id: str
    online: bool = False
    last_seen: Optional[str] = None
    readings: dict = Field(default_factory=dict)
    alerts: list[str] = Field(default_factory=list)


class LiveStatusResponse(BaseModel):
    """Live status of deployed nodes."""
    session_id: str
    nodes: dict[str, NodeTelemetry] = Field(default_factory=dict)
    server_online: bool = False
    last_updated: Optional[str] = None


# WebSocket Event Models
class WSEvent(BaseModel):
    """WebSocket event."""
    stage: str  # "build" | "simulate" | "deploy"
    type: str
    data: dict = Field(default_factory=dict)
