"""Terraform subprocess management with real-time output streaming."""

import asyncio
import json
import os
import re
import shutil
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import AsyncGenerator, Callable, Awaitable, Optional


class TerraformStatus(str, Enum):
    """Terraform operation status."""
    IDLE = "idle"
    INITIALIZING = "initializing"
    PLANNING = "planning"
    APPLYING = "applying"
    DEPLOYED = "deployed"
    DESTROYING = "destroying"
    DESTROYED = "destroyed"
    ERROR = "error"


@dataclass
class TerraformOutputs:
    """Parsed Terraform outputs."""
    server_ip: str = ""
    server_url: str = ""
    mqtt_broker: str = ""
    mqtt_port: int = 1883
    mqtt_ws_url: str = ""
    ssh_command: str = ""
    instance_id: str = ""
    swarm_id: str = ""


@dataclass
class TerraformProgress:
    """Progress update during Terraform operations."""
    status: TerraformStatus
    step: str
    resource: Optional[str] = None
    action: Optional[str] = None  # "create", "update", "destroy"
    message: Optional[str] = None
    progress_percent: int = 0


class TerraformRunner:
    """
    Manages Terraform operations in subprocesses with real-time output streaming.

    Each session gets its own working directory with isolated state to allow
    concurrent deployments for different swarms.
    """

    def __init__(
        self,
        infra_source_dir: Path,
        working_base_dir: Path,
        progress_callback: Optional[Callable[[TerraformProgress], Awaitable[None]]] = None,
    ):
        """
        Initialize TerraformRunner.

        Args:
            infra_source_dir: Path to the source infra/ directory with Terraform configs
            working_base_dir: Base directory for session-specific working directories
            progress_callback: Async callback for progress updates
        """
        self.infra_source_dir = Path(infra_source_dir)
        self.working_base_dir = Path(working_base_dir)
        self.progress_callback = progress_callback
        self._process: Optional[asyncio.subprocess.Process] = None
        self._cancelled = False

    def _get_working_dir(self, session_id: str) -> Path:
        """Get session-specific working directory."""
        return self.working_base_dir / f"terraform-{session_id}"

    async def _setup_working_dir(self, session_id: str) -> Path:
        """Create and populate session-specific Terraform working directory."""
        working_dir = self._get_working_dir(session_id)

        # Clean up existing directory if present
        if working_dir.exists():
            shutil.rmtree(working_dir)

        # Copy infra source to working directory
        shutil.copytree(self.infra_source_dir, working_dir)

        return working_dir

    async def _emit_progress(self, progress: TerraformProgress):
        """Emit progress update via callback."""
        if self.progress_callback:
            await self.progress_callback(progress)

    async def _run_command(
        self,
        cmd: list[str],
        working_dir: Path,
        env: Optional[dict] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Run a command and yield output lines as they're produced.

        Args:
            cmd: Command and arguments
            working_dir: Directory to run command in
            env: Additional environment variables

        Yields:
            Output lines from stdout and stderr
        """
        full_env = os.environ.copy()
        if env:
            full_env.update(env)

        self._process = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=working_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            env=full_env,
        )

        try:
            while True:
                if self._cancelled:
                    self._process.terminate()
                    break

                line = await asyncio.wait_for(
                    self._process.stdout.readline(),
                    timeout=1.0,
                )

                if not line:
                    break

                yield line.decode("utf-8").rstrip()
        except asyncio.TimeoutError:
            pass
        except Exception as e:
            yield f"Error: {str(e)}"
        finally:
            if self._process.returncode is None:
                try:
                    await asyncio.wait_for(self._process.wait(), timeout=5.0)
                except asyncio.TimeoutError:
                    self._process.kill()

    def _parse_apply_line(self, line: str) -> Optional[TerraformProgress]:
        """Parse Terraform apply output line for progress info."""
        # Match resource creation/update/destruction
        # Example: aws_instance.aggregation_server: Creating...
        resource_match = re.match(
            r"^(\w+\.\w+): (Creating|Modifying|Destroying)\.\.\.",
            line,
        )
        if resource_match:
            resource, action = resource_match.groups()
            action_map = {
                "Creating": "create",
                "Modifying": "update",
                "Destroying": "destroy",
            }
            return TerraformProgress(
                status=TerraformStatus.APPLYING,
                step=f"{action} {resource}",
                resource=resource,
                action=action_map.get(action, action.lower()),
            )

        # Match creation complete
        # Example: aws_instance.aggregation_server: Creation complete after 45s [id=i-xxxxx]
        complete_match = re.match(
            r"^(\w+\.\w+): (Creation|Modification|Destruction) complete",
            line,
        )
        if complete_match:
            resource, action = complete_match.groups()
            return TerraformProgress(
                status=TerraformStatus.APPLYING,
                step=f"{action} complete: {resource}",
                resource=resource,
                action="complete",
            )

        # Match "Apply complete!"
        if "Apply complete!" in line:
            return TerraformProgress(
                status=TerraformStatus.DEPLOYED,
                step="Apply complete",
                message=line,
            )

        # Match "Destroy complete!"
        if "Destroy complete!" in line:
            return TerraformProgress(
                status=TerraformStatus.DESTROYED,
                step="Destroy complete",
                message=line,
            )

        return None

    async def init(self, session_id: str) -> bool:
        """
        Run terraform init for a session.

        Args:
            session_id: Session identifier

        Returns:
            True if init succeeded
        """
        working_dir = await self._setup_working_dir(session_id)

        await self._emit_progress(TerraformProgress(
            status=TerraformStatus.INITIALIZING,
            step="Running terraform init",
            progress_percent=0,
        ))

        cmd = ["terraform", "init", "-no-color"]
        success = True

        async for line in self._run_command(cmd, working_dir):
            if "Error" in line or "error" in line.lower():
                success = False
                await self._emit_progress(TerraformProgress(
                    status=TerraformStatus.ERROR,
                    step="Init failed",
                    message=line,
                ))

        if self._process and self._process.returncode != 0:
            success = False

        if success:
            await self._emit_progress(TerraformProgress(
                status=TerraformStatus.INITIALIZING,
                step="Init complete",
                progress_percent=20,
            ))

        return success

    async def apply(
        self,
        session_id: str,
        variables: dict,
    ) -> AsyncGenerator[TerraformProgress, None]:
        """
        Run terraform apply for a session.

        Args:
            session_id: Session identifier
            variables: Terraform variables (swarm_id, region, instance_type, etc.)

        Yields:
            TerraformProgress updates
        """
        working_dir = self._get_working_dir(session_id)

        if not working_dir.exists():
            yield TerraformProgress(
                status=TerraformStatus.ERROR,
                step="Working directory not found",
                message="Run init first",
            )
            return

        # Build environment with TF_VAR_ prefix for variables
        env = {}
        for key, value in variables.items():
            env[f"TF_VAR_{key}"] = str(value)

        # Plan phase
        yield TerraformProgress(
            status=TerraformStatus.PLANNING,
            step="Creating execution plan",
            progress_percent=25,
        )

        plan_cmd = ["terraform", "plan", "-no-color", "-out=tfplan"]
        async for line in self._run_command(plan_cmd, working_dir, env):
            if "Error" in line:
                yield TerraformProgress(
                    status=TerraformStatus.ERROR,
                    step="Plan failed",
                    message=line,
                )
                return

        if self._process and self._process.returncode != 0:
            yield TerraformProgress(
                status=TerraformStatus.ERROR,
                step="Plan failed",
                message="Terraform plan returned non-zero exit code",
            )
            return

        yield TerraformProgress(
            status=TerraformStatus.PLANNING,
            step="Plan complete",
            progress_percent=40,
        )

        # Apply phase
        yield TerraformProgress(
            status=TerraformStatus.APPLYING,
            step="Applying changes",
            progress_percent=50,
        )

        apply_cmd = ["terraform", "apply", "-no-color", "-auto-approve", "tfplan"]
        resource_count = 0

        async for line in self._run_command(apply_cmd, working_dir, env):
            progress = self._parse_apply_line(line)
            if progress:
                # Estimate progress based on typical resource creation
                if progress.action == "complete":
                    resource_count += 1
                    progress.progress_percent = min(50 + resource_count * 15, 95)
                yield progress

        if self._process and self._process.returncode != 0:
            yield TerraformProgress(
                status=TerraformStatus.ERROR,
                step="Apply failed",
                message="Terraform apply returned non-zero exit code",
            )
            return

        yield TerraformProgress(
            status=TerraformStatus.DEPLOYED,
            step="Deployment complete",
            progress_percent=100,
        )

    async def destroy(self, session_id: str) -> AsyncGenerator[TerraformProgress, None]:
        """
        Run terraform destroy for a session.

        Args:
            session_id: Session identifier

        Yields:
            TerraformProgress updates
        """
        working_dir = self._get_working_dir(session_id)

        if not working_dir.exists():
            yield TerraformProgress(
                status=TerraformStatus.ERROR,
                step="Working directory not found",
                message="No deployment found for this session",
            )
            return

        yield TerraformProgress(
            status=TerraformStatus.DESTROYING,
            step="Starting destruction",
            progress_percent=10,
        )

        destroy_cmd = ["terraform", "destroy", "-no-color", "-auto-approve"]

        async for line in self._run_command(destroy_cmd, working_dir):
            progress = self._parse_apply_line(line)
            if progress:
                if progress.status == TerraformStatus.DESTROYED:
                    progress.progress_percent = 100
                yield progress

        if self._process and self._process.returncode != 0:
            yield TerraformProgress(
                status=TerraformStatus.ERROR,
                step="Destroy failed",
                message="Terraform destroy returned non-zero exit code",
            )
            return

        yield TerraformProgress(
            status=TerraformStatus.DESTROYED,
            step="Destruction complete",
            progress_percent=100,
        )

        # Clean up working directory
        try:
            shutil.rmtree(working_dir)
        except Exception:
            pass

    async def get_outputs(self, session_id: str) -> Optional[TerraformOutputs]:
        """
        Get Terraform outputs for a session.

        Args:
            session_id: Session identifier

        Returns:
            TerraformOutputs or None if not available
        """
        working_dir = self._get_working_dir(session_id)

        if not working_dir.exists():
            return None

        cmd = ["terraform", "output", "-json"]
        output_lines = []

        async for line in self._run_command(cmd, working_dir):
            output_lines.append(line)

        if self._process and self._process.returncode != 0:
            return None

        try:
            output_json = json.loads("\n".join(output_lines))

            return TerraformOutputs(
                server_ip=output_json.get("server_ip", {}).get("value", ""),
                server_url=output_json.get("server_url", {}).get("value", ""),
                mqtt_broker=output_json.get("mqtt_broker", {}).get("value", ""),
                mqtt_port=output_json.get("mqtt_port", {}).get("value", 1883),
                mqtt_ws_url=output_json.get("mqtt_ws_url", {}).get("value", ""),
                ssh_command=output_json.get("ssh_command", {}).get("value", ""),
                instance_id=output_json.get("instance_id", {}).get("value", ""),
                swarm_id=output_json.get("swarm_id", {}).get("value", ""),
            )
        except (json.JSONDecodeError, KeyError):
            return None

    def cancel(self):
        """Cancel any running Terraform operation."""
        self._cancelled = True
        if self._process and self._process.returncode is None:
            self._process.terminate()

    async def check_installed(self) -> bool:
        """Check if Terraform is installed and accessible."""
        try:
            process = await asyncio.create_subprocess_exec(
                "terraform", "version",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await process.wait()
            return process.returncode == 0
        except FileNotFoundError:
            return False

    async def check_aws_credentials(self) -> bool:
        """Check if AWS credentials are configured."""
        # Check environment variables
        if os.environ.get("AWS_ACCESS_KEY_ID") and os.environ.get("AWS_SECRET_ACCESS_KEY"):
            return True

        # Check AWS CLI configuration
        aws_config = Path.home() / ".aws" / "credentials"
        if aws_config.exists():
            return True

        return False
