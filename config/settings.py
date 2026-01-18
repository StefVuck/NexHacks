"""Centralized configuration for Swarm Architect.

All configurable values should be defined here instead of magic constants.
Values can be overridden via environment variables.
"""

import os
from dataclasses import dataclass, field


@dataclass
class Settings:
    """Application settings with sensible defaults."""

    # Build settings
    max_build_iterations: int = 5
    simulation_timeout_qemu: float = 10.0
    simulation_timeout_wokwi: float = 30.0

    # API settings
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: list[str] = field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ]
    )

    # Claude API
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-20250514"

    # Wokwi (ESP32 simulation)
    wokwi_cli_token: str = ""

    # Default board
    default_board_id: str = "lm3s6965"

    # Demo/simulation mode
    simulate_hardware: bool = True  # Simulate USB devices for demo
    simulate_cloud: bool = True  # Simulate Terraform deployment with hardcoded IP

    def __post_init__(self):
        """Load values from environment variables."""
        self.max_build_iterations = int(
            os.getenv("MAX_BUILD_ITERATIONS", self.max_build_iterations)
        )
        self.simulation_timeout_qemu = float(
            os.getenv("SIMULATION_TIMEOUT_QEMU", self.simulation_timeout_qemu)
        )
        self.simulation_timeout_wokwi = float(
            os.getenv("SIMULATION_TIMEOUT_WOKWI", self.simulation_timeout_wokwi)
        )
        self.api_port = int(os.getenv("API_PORT", self.api_port))
        self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY", self.anthropic_api_key)
        self.claude_model = os.getenv("CLAUDE_MODEL", self.claude_model)
        self.wokwi_cli_token = os.getenv("WOKWI_CLI_TOKEN", self.wokwi_cli_token)
        self.default_board_id = os.getenv("DEFAULT_BOARD_ID", self.default_board_id)
        # Demo mode: default True for hardware, set SIMULATE_HARDWARE=false to disable
        sim_env = os.getenv("SIMULATE_HARDWARE", "").lower()
        if sim_env:
            self.simulate_hardware = sim_env in ("true", "1", "yes")

        # Cloud simulation: default False (use real Terraform)
        sim_cloud_env = os.getenv("SIMULATE_CLOUD", "").lower()
        if sim_cloud_env:
            self.simulate_cloud = sim_cloud_env in ("true", "1", "yes")

        # Parse CORS origins from env if provided
        cors_env = os.getenv("CORS_ORIGINS")
        if cors_env:
            self.cors_origins = [o.strip() for o in cors_env.split(",")]


# Global settings instance
settings = Settings()
