"""Pydantic models for API requests and responses.

Implements the Build and Simulate stage state machines.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# === ENUMS ===


class NodeBuildStatus(str, Enum):
    """State machine for individual node build process."""

    PENDING = "pending"
    GENERATING = "generating"
    COMPILING = "compiling"
    SIMULATING = "simulating"
    TESTING = "testing"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"


class BuildSessionStatus(str, Enum):
    """State machine for overall build session."""

    IDLE = "idle"
    RUNNING = "running"
    SUCCESS = "success"
    PARTIAL = "partial"  # Some nodes succeeded, some failed/skipped
    FAILED = "failed"
    CANCELLED = "cancelled"


class SimulationStatus(str, Enum):
    """State machine for simulation session."""

    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    STOPPED = "stopped"
    COMPLETED = "completed"


# === DESIGN STAGE MODELS ===


class NodePosition(BaseModel):
    """Position of a node on the canvas."""

    x: float
    y: float


class TestAssertionSpec(BaseModel):
    """Test assertion specification."""

    name: str
    pattern: str
    required: bool = True


class NodePlacement(BaseModel):
    """Node with position and configuration."""

    node_id: str
    description: str
    board_id: str = "lm3s6965"
    position: Optional[NodePosition] = None
    assertions: list[TestAssertionSpec] = Field(default_factory=list)


class SystemDesign(BaseModel):
    """Complete system design with nodes and layout."""

    design_id: str
    description: str
    nodes: list[NodePlacement]
    created_at: str


class DesignParseRequest(BaseModel):
    """Request to parse natural language into system spec."""

    prompt: str = Field(..., description="Natural language description of the system")
    board_id: str = Field(default="lm3s6965", description="Target board ID")


# === BUILD STAGE MODELS ===


class MemoryUsage(BaseModel):
    """Memory usage from compilation."""

    flash_used: int = 0
    flash_limit: int = 0
    ram_used: int = 0
    ram_limit: int = 0

    @property
    def flash_percent(self) -> float:
        return (self.flash_used / self.flash_limit * 100) if self.flash_limit else 0

    @property
    def ram_percent(self) -> float:
        return (self.ram_used / self.ram_limit * 100) if self.ram_limit else 0


class TestAssertionResult(BaseModel):
    """Result of a single test assertion."""

    name: str
    pattern: str
    passed: bool
    matched_line: Optional[str] = None


class NodeIteration(BaseModel):
    """State for a single iteration of node build."""

    iteration: int
    generated_code: Optional[str] = None
    compile_output: Optional[str] = None
    compile_success: bool = False
    simulation_output: Optional[str] = None
    simulation_success: bool = False
    test_results: list[TestAssertionResult] = Field(default_factory=list)
    error_message: Optional[str] = None
    memory_usage: Optional[MemoryUsage] = None


class NodeBuildState(BaseModel):
    """Complete state for building a single node."""

    node_id: str
    description: str
    board_type: str
    status: NodeBuildStatus = NodeBuildStatus.PENDING
    current_iteration: int = 0
    max_iterations: int = 3
    iterations: list[NodeIteration] = Field(default_factory=list)
    final_binary_path: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    @property
    def latest_iteration(self) -> Optional[NodeIteration]:
        return self.iterations[-1] if self.iterations else None


class BuildSettings(BaseModel):
    """Build configuration settings."""

    max_iterations: int = 3
    simulation_timeout_seconds: float = 10.0
    board_id: str = "lm3s6965"


class BuildStartRequest(BaseModel):
    """Request to start build process."""

    design_id: Optional[str] = None
    description: str = ""
    board_id: str = "lm3s6965"
    nodes: list[dict] = Field(default_factory=list)
    settings: Optional[BuildSettings] = None


class BuildSessionState(BaseModel):
    """Complete state for a build session."""

    session_id: str
    status: BuildSessionStatus = BuildSessionStatus.IDLE
    settings: BuildSettings = Field(default_factory=BuildSettings)
    nodes: dict[str, NodeBuildState] = Field(default_factory=dict)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    @property
    def completed_count(self) -> int:
        return sum(
            1
            for n in self.nodes.values()
            if n.status in [NodeBuildStatus.SUCCESS, NodeBuildStatus.SKIPPED]
        )

    @property
    def total_count(self) -> int:
        return len(self.nodes)

    @property
    def failed_count(self) -> int:
        return sum(1 for n in self.nodes.values() if n.status == NodeBuildStatus.FAILED)


class BuildStatusResponse(BaseModel):
    """Build status for a session (simplified)."""

    session_id: str
    status: str
    current_node: Optional[str] = None
    current_iteration: int = 0
    completed_count: int = 0
    total_count: int = 0
    nodes: dict[str, NodeBuildState] = Field(default_factory=dict)


# === SIMULATE STAGE MODELS ===


class SimulationMessage(BaseModel):
    """A message sent during simulation."""

    timestamp: datetime = Field(default_factory=datetime.now)
    from_node: str
    to_node: str  # "broker", "server", or node_id
    payload: dict = Field(default_factory=dict)
    topic: Optional[str] = None


class NodeSimulationState(BaseModel):
    """State of a node during simulation."""

    node_id: str
    status: str = "offline"  # "online" | "offline" | "error"
    latest_output: Optional[str] = None
    latest_readings: dict = Field(default_factory=dict)
    message_count: int = 0


class SimulateStartRequest(BaseModel):
    """Request to start simulation."""

    session_id: str
    timeout_seconds: float = 30.0
    speed: float = 1.0


class SimulateSpeedRequest(BaseModel):
    """Request to change simulation speed."""

    speed: float = 1.0  # 1, 2, or 5


class SimulationSessionState(BaseModel):
    """Complete state for a simulation session."""

    session_id: str
    status: SimulationStatus = SimulationStatus.IDLE
    speed: float = 1.0
    elapsed_time_ms: int = 0
    nodes: dict[str, NodeSimulationState] = Field(default_factory=dict)
    messages: list[SimulationMessage] = Field(default_factory=list)
    test_summary: dict[str, bool] = Field(default_factory=dict)
    alerts: list[str] = Field(default_factory=list)
    started_at: Optional[datetime] = None


class SimulateStatusResponse(BaseModel):
    """Simulation status response."""

    session_id: str
    status: str
    speed: float = 1.0
    elapsed_time_ms: int = 0
    nodes: dict[str, NodeSimulationState] = Field(default_factory=dict)
    message_count: int = 0
    test_summary: dict[str, bool] = Field(default_factory=dict)


# === DEPLOY STAGE MODELS ===


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


# === WEBSOCKET EVENT MODELS ===


class WSEvent(BaseModel):
    """WebSocket event."""

    stage: str  # "build" | "simulate" | "deploy"
    type: str
    data: dict = Field(default_factory=dict)
