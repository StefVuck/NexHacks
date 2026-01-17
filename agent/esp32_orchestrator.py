"""ESP32-specific orchestration using Wokwi for simulation."""

import asyncio
import os
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

import anthropic

from agent.boards import BoardConfig, get_board, Architecture
from agent.templates import get_template_for_board, get_platformio_ini
from simulator.wokwi import WokwiOrchestrator, WokwiCircuit, WokwiResult, generate_esp32_circuit

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
MODEL = "claude-sonnet-4-20250514"
MAX_ITERATIONS = 3


@dataclass
class ESP32CompilationResult:
    success: bool
    firmware_path: Path | None = None
    errors: str | None = None


@dataclass
class TestAssertion:
    name: str
    pattern: str
    required: bool = True


@dataclass
class ESP32NodeSpec:
    node_id: str
    description: str
    features: list[str] = field(default_factory=list)  # wifi, mqtt, dht, http
    assertions: list[TestAssertion] = field(default_factory=list)
    mqtt_topics: list[str] = field(default_factory=list)  # Topics to subscribe to
    server_url: str | None = None  # HTTP endpoint to call


@dataclass
class ESP32SystemSpec:
    description: str
    nodes: list[ESP32NodeSpec]
    board_id: str = "esp32"
    mqtt_broker: str = "broker.hivemq.com"
    server_base_url: str | None = None  # For HTTP-based communication


@dataclass
class ESP32IterationResult:
    iteration: int
    generated_code: str
    compilation: ESP32CompilationResult
    simulation: WokwiResult | None = None
    test_results: list[dict] = field(default_factory=list)

    @property
    def success(self) -> bool:
        if not self.compilation.success:
            return False
        if self.simulation and not self.simulation.success:
            return False
        return all(t.get("passed", False) for t in self.test_results)


class ESP32GenerationLoop:
    """Orchestrates ESP32 firmware generation with Wokwi simulation."""

    def __init__(self, work_dir: Path | None = None):
        self.client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        self.wokwi = WokwiOrchestrator()
        self._work_dir_obj: tempfile.TemporaryDirectory | None = None
        self._work_dir = work_dir

    @property
    def work_dir(self) -> Path:
        if self._work_dir:
            return self._work_dir
        if self._work_dir_obj is None:
            self._work_dir_obj = tempfile.TemporaryDirectory(prefix="esp32_")
        return Path(self._work_dir_obj.name)

    def generate_firmware(
        self,
        node: ESP32NodeSpec,
        spec: ESP32SystemSpec,
        previous_error: str | None = None,
    ) -> str:
        """Generate ESP32 Arduino code for a node."""
        board = get_board(spec.board_id)
        template = get_template_for_board(spec.board_id, node.features)

        features_desc = ", ".join(node.features) if node.features else "basic GPIO"

        system_prompt = f"""You are an embedded systems expert generating ESP32 Arduino firmware.

Target: {board.name}
Features: {features_desc}
Flash: {board.flash_kb}KB, RAM: {board.ram_kb}KB

The following helper code is PROVIDED - use these functions, do not redefine them:
```cpp
{template}
```

Generate setup() and loop() functions that implement the requirements.
Use Serial.println() for debug output.
{"Use mqtt_publish() to send data, mqtt_subscribe() to receive." if "mqtt" in node.features else ""}
{"Use http_post() or http_get() for HTTP communication." if "http" in node.features else ""}

Output ONLY valid Arduino C++ code. Include necessary #include statements at the top.
Do not include the helper functions - they are already provided."""

        user_prompt = f"""Generate ESP32 firmware for: {node.description}

Node ID: {node.node_id}
{"MQTT Topics: " + ", ".join(node.mqtt_topics) if node.mqtt_topics else ""}
{"Server URL: " + node.server_url if node.server_url else ""}
{"MQTT Broker: " + spec.mqtt_broker if "mqtt" in node.features else ""}

Required serial output patterns (for testing):
{chr(10).join(f'  - "{a.pattern}"' for a in node.assertions)}

Generate setup() and loop() functions. The helper code is already included."""

        if previous_error:
            user_prompt += f"\n\nPREVIOUS ATTEMPT FAILED:\n{previous_error}\n\nFix all issues."

        response = self.client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )

        generated = response.content[0].text

        # Strip markdown fences
        if "```" in generated:
            lines = generated.split("\n")
            in_code = False
            code_lines = []
            for line in lines:
                if line.startswith("```"):
                    in_code = not in_code
                elif in_code:
                    code_lines.append(line)
            generated = "\n".join(code_lines)

        # Combine template and generated code
        full_code = template + "\n\n// Generated code:\n" + generated

        # Add callback stub if using MQTT and not defined
        if "mqtt" in node.features and "mqtt_callback" not in generated:
            callback = '''
void mqtt_callback(char* topic, byte* payload, unsigned int length) {
    Serial.printf("Received on %s: ", topic);
    for (int i = 0; i < length; i++) Serial.print((char)payload[i]);
    Serial.println();
}
'''
            full_code = callback + full_code

        return full_code

    def compile_firmware(self, code: str, node_id: str, board_id: str) -> ESP32CompilationResult:
        """Compile ESP32 code using PlatformIO."""
        project_dir = self.work_dir / node_id
        src_dir = project_dir / "src"
        src_dir.mkdir(parents=True, exist_ok=True)

        # Write source
        (src_dir / "main.cpp").write_text(code)

        # Write platformio.ini
        (project_dir / "platformio.ini").write_text(get_platformio_ini(board_id))

        # Compile with PlatformIO
        result = subprocess.run(
            ["pio", "run", "-d", str(project_dir)],
            capture_output=True,
            text=True,
        )

        if result.returncode == 0:
            # Find the firmware binary
            firmware = project_dir / ".pio" / "build" / "esp32" / "firmware.bin"
            if firmware.exists():
                return ESP32CompilationResult(success=True, firmware_path=firmware)
            else:
                return ESP32CompilationResult(
                    success=False,
                    errors="Firmware binary not found after successful compile"
                )
        else:
            return ESP32CompilationResult(success=False, errors=result.stderr)

    def check_output(self, output: str, assertions: list[TestAssertion]) -> list[dict]:
        """Check simulation output against expected patterns."""
        results = []
        for assertion in assertions:
            passed = assertion.pattern in output
            results.append({
                "name": assertion.name,
                "pattern": assertion.pattern,
                "passed": passed,
                "required": assertion.required,
            })
        return results

    async def run_iteration(
        self,
        node: ESP32NodeSpec,
        spec: ESP32SystemSpec,
        iteration: int,
        previous_error: str | None = None,
    ) -> ESP32IterationResult:
        """Run single iteration of generate -> compile -> simulate."""
        code = self.generate_firmware(node, spec, previous_error)
        compilation = self.compile_firmware(code, node.node_id, spec.board_id)

        result = ESP32IterationResult(
            iteration=iteration,
            generated_code=code,
            compilation=compilation,
        )

        if not compilation.success:
            return result

        # Generate circuit
        circuit = generate_esp32_circuit(
            sensors=["dht22"] if "dht" in node.features else None,
            leds=["green"] if any(a.pattern.lower().find("led") >= 0 for a in node.assertions) else None,
        )

        # Run in Wokwi
        result.simulation = await self.wokwi.run_esp32(
            compilation.firmware_path,
            circuit,
            timeout_seconds=30.0,
        )

        # Check output
        if result.simulation.success:
            result.test_results = self.check_output(
                result.simulation.serial_output,
                node.assertions,
            )

        return result

    async def run(
        self,
        spec: ESP32SystemSpec,
        on_progress: callable = None,
    ) -> dict[str, list[ESP32IterationResult]]:
        """Run full generation loop for all nodes."""
        all_results: dict[str, list[ESP32IterationResult]] = {}

        for node in spec.nodes:
            node_results = []
            previous_error = None

            for iteration in range(MAX_ITERATIONS):
                if on_progress:
                    on_progress(node.node_id, iteration, "running")

                result = await self.run_iteration(node, spec, iteration, previous_error)
                node_results.append(result)

                if result.success:
                    if on_progress:
                        on_progress(node.node_id, iteration, "success")
                    break

                # Build error context
                if not result.compilation.success:
                    previous_error = f"Compilation error:\n{result.compilation.errors}"
                elif result.simulation and not result.simulation.success:
                    previous_error = f"Simulation error:\n{result.simulation.error}"
                else:
                    failed = [t for t in result.test_results if not t.get("passed")]
                    previous_error = "Test failures:\n" + "\n".join(
                        f"- Expected '{t['pattern']}' not found" for t in failed
                    )
                    if result.simulation:
                        previous_error += f"\n\nActual output:\n{result.simulation.serial_output[:1000]}"

                if on_progress:
                    on_progress(node.node_id, iteration, "failed")

            all_results[node.node_id] = node_results

        return all_results

    async def cleanup(self):
        await self.wokwi.disconnect()
        if self._work_dir_obj:
            self._work_dir_obj.cleanup()
