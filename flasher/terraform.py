"""Parse Terraform outputs for deployment configuration."""

import json
import subprocess
from dataclasses import dataclass
from pathlib import Path

from agent.templates import DeployConfig


@dataclass
class TerraformOutputs:
    """Parsed outputs from terraform."""
    server_ip: str | None = None
    server_url: str | None = None
    mqtt_broker: str | None = None
    mqtt_port: int = 1883
    raw: dict = None

    def to_deploy_config(
        self,
        wifi_ssid: str,
        wifi_password: str,
        node_id: str,
        swarm_id: str,
    ) -> DeployConfig:
        """Convert to DeployConfig for firmware injection."""
        server_url = self.server_url
        if not server_url and self.server_ip:
            server_url = f"http://{self.server_ip}:8080"

        mqtt_broker = self.mqtt_broker or self.server_ip or "broker.hivemq.com"

        return DeployConfig(
            wifi_ssid=wifi_ssid,
            wifi_password=wifi_password,
            server_url=server_url or "http://localhost:8080",
            mqtt_broker=mqtt_broker,
            mqtt_port=self.mqtt_port,
            node_id=node_id,
            swarm_id=swarm_id,
        )


def load_terraform_outputs(infra_dir: Path | str) -> TerraformOutputs:
    """Load outputs from terraform state.

    Args:
        infra_dir: Path to directory containing terraform files

    Returns:
        TerraformOutputs with parsed values
    """
    infra_dir = Path(infra_dir)

    try:
        result = subprocess.run(
            ["terraform", "output", "-json"],
            cwd=infra_dir,
            capture_output=True,
            text=True,
            check=True,
        )
        outputs = json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Terraform output failed: {e.stderr}")
        return TerraformOutputs()
    except json.JSONDecodeError:
        print("Failed to parse terraform output as JSON")
        return TerraformOutputs()

    # Extract known outputs (terraform wraps values in {"value": ..., "type": ...})
    def get_value(key: str) -> str | None:
        if key in outputs and "value" in outputs[key]:
            return outputs[key]["value"]
        return None

    return TerraformOutputs(
        server_ip=get_value("server_ip") or get_value("public_ip"),
        server_url=get_value("server_url") or get_value("endpoint"),
        mqtt_broker=get_value("mqtt_broker") or get_value("mqtt_host"),
        mqtt_port=int(get_value("mqtt_port") or 1883),
        raw=outputs,
    )


def load_from_json(json_path: Path | str) -> TerraformOutputs:
    """Load outputs from a JSON file (for testing/manual config)."""
    with open(json_path) as f:
        data = json.load(f)

    return TerraformOutputs(
        server_ip=data.get("server_ip"),
        server_url=data.get("server_url"),
        mqtt_broker=data.get("mqtt_broker"),
        mqtt_port=data.get("mqtt_port", 1883),
        raw=data,
    )
