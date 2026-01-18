"""Build stage API routes with detailed state tracking."""

import asyncio
from datetime import datetime

from fastapi import APIRouter, HTTPException

from agent import GenerationLoop, NodeSpec, SystemSpec, TestAssertion
from agent.boards import get_board, check_toolchain_available
from api.models import (
    BuildSessionStatus,
    BuildSettings,
    BuildStartRequest,
    BuildStatusResponse,
    MemoryUsage,
    NodeBuildState,
    NodeBuildStatus,
    NodeIteration,
    TestAssertionResult,
)
from api.sessions import session_manager
from config.settings import settings

router = APIRouter()


@router.post("/start")
async def start_build(request: BuildStartRequest):
    """Start the firmware generation loop with detailed progress tracking."""
    # Check toolchain availability before starting
    board_id = request.board_id or (request.settings.board_id if request.settings else "lm3s6965")
    try:
        board = get_board(board_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    toolchain_ok, toolchain_error = check_toolchain_available(board)
    if not toolchain_ok:
        raise HTTPException(status_code=400, detail=toolchain_error)

    # Create or get existing session (use provided session_id if available, e.g., from project)
    if request.session_id:
        session = session_manager.create_session(request.session_id)
        session_id = request.session_id
    else:
        session = session_manager.create_session()
        session_id = session.session_id

    # Build settings from request or defaults
    build_settings = request.settings or BuildSettings(
        max_iterations=settings.max_build_iterations,
        simulation_timeout_seconds=settings.simulation_timeout_qemu,
        board_id=request.board_id,
    )

    # Initialize build state for all nodes
    session.init_build_nodes(request.nodes, build_settings)

    # Convert request to SystemSpec
    nodes = []
    for node_data in request.nodes:
        assertions = [
            TestAssertion(
                name=a.get("name", "test"),
                pattern=a.get("pattern", ""),
                required=a.get("required", True),
            )
            for a in node_data.get("assertions", [])
        ]

        # If no assertions specified, add a default one to ensure iteration happens
        if not assertions:
            assertions = [
                TestAssertion(
                    name="produces_output",
                    pattern=":",  # Look for colon which is common in key:value output
                    required=True,
                )
            ]

        nodes.append(
            NodeSpec(
                node_id=node_data["node_id"],
                description=node_data["description"],
                assertions=assertions,
                board_id=node_data.get("board_type"),  # Per-node board type
            )
        )

    spec = SystemSpec(
        description=request.description,
        board_id=build_settings.board_id,
        nodes=nodes,
    )

    # Store spec in session
    session.system_spec = {
        "description": spec.description,
        "board_id": spec.board_id,
        "nodes": [
            {
                "node_id": n.node_id,
                "description": n.description,
                "assertions": [{"name": a.name, "pattern": a.pattern} for a in n.assertions],
            }
            for n in spec.nodes
        ],
    }

    # Start build in background
    async def run_build():
        session.build_state.status = BuildSessionStatus.RUNNING
        session.build_state.started_at = datetime.now()
        default_board = spec.board

        try:
            loop = GenerationLoop()

            for node in spec.nodes:
                print(f"Processing node: {node.node_id}")

                # Use per-node board type if specified, otherwise fall back to default
                if node.board_id:
                    try:
                        board = get_board(node.board_id)
                        print(f"  Using board: {board.name} ({node.board_id})")
                    except ValueError as e:
                        print(f"  Invalid board {node.board_id}, using default: {e}")
                        board = default_board
                else:
                    board = default_board
                    print(f"  Using default board: {board.name}")

                node_state = session.get_node_state(node.node_id)
                if not node_state:
                    print(f"WARNING: No node state for {node.node_id}, skipping!")
                    await session_manager.broadcast_to_session(
                        session_id,
                        {
                            "stage": "build",
                            "type": "error",
                            "data": {
                                "node_id": node.node_id,
                                "message": f"Node state not found for {node.node_id}",
                            },
                        },
                    )
                    continue

                node_state.started_at = datetime.now()
                previous_error = None
                success = False

                for iteration in range(build_settings.max_iterations):
                    node_state.current_iteration = iteration + 1

                    # === GENERATING ===
                    session.update_node_status(node.node_id, NodeBuildStatus.GENERATING)
                    await session_manager.broadcast_to_session(
                        session_id,
                        {
                            "stage": "build",
                            "type": "node_status",
                            "data": {
                                "node_id": node.node_id,
                                "status": "generating",
                                "iteration": iteration + 1,
                                "max_iterations": build_settings.max_iterations,
                            },
                        },
                    )

                    # Build the prompt for visibility
                    llm_prompt = f"""Generate bare-metal firmware for this node in a distributed IoT system.

SYSTEM PURPOSE: {spec.description}

THIS NODE'S ROLE: {node.description}

Target board: {board.name}
Architecture: {board.arch.value}
Available memory: {board.flash_kb}KB Flash, {board.ram_kb}KB RAM

Required output patterns (must appear in semihosting output):
{chr(10).join(f'  - "{a.pattern}"' for a in node.assertions) if node.assertions else '  - (none specified - generate reasonable telemetry output)'}"""

                    if previous_error:
                        llm_prompt += f"\n\nPREVIOUS ATTEMPT FAILED:\n{previous_error}\n\nFix all issues."

                    # Broadcast LLM prompt
                    await session_manager.broadcast_to_session(
                        session_id,
                        {
                            "stage": "build",
                            "type": "llm_request",
                            "data": {
                                "node_id": node.node_id,
                                "iteration": iteration + 1,
                                "prompt": llm_prompt,
                            },
                        },
                    )

                    # Generate code with system context
                    try:
                        code = loop.generate_firmware(
                            node, board, previous_error,
                            system_context=spec.description
                        )
                    except Exception as gen_error:
                        print(f"Code generation failed for {node.node_id}: {gen_error}")
                        import traceback
                        traceback.print_exc()

                        # Broadcast the error
                        await session_manager.broadcast_to_session(
                            session_id,
                            {
                                "stage": "build",
                                "type": "error",
                                "data": {
                                    "node_id": node.node_id,
                                    "iteration": iteration + 1,
                                    "message": f"Code generation failed: {str(gen_error)}",
                                },
                            },
                        )
                        previous_error = f"Code generation error: {str(gen_error)}"
                        continue

                    if not code:
                        print(f"No code generated for {node.node_id}")
                        previous_error = "No code was generated"
                        continue

                    # Broadcast LLM response (the generated code)
                    await session_manager.broadcast_to_session(
                        session_id,
                        {
                            "stage": "build",
                            "type": "llm_response",
                            "data": {
                                "node_id": node.node_id,
                                "iteration": iteration + 1,
                                "response": code[:4000] if code else "",
                            },
                        },
                    )

                    # Send code preview
                    await session_manager.broadcast_to_session(
                        session_id,
                        {
                            "stage": "build",
                            "type": "code_generated",
                            "data": {
                                "node_id": node.node_id,
                                "iteration": iteration + 1,
                                "code_preview": code[:2000] if code else "",
                            },
                        },
                    )

                    # === COMPILING ===
                    session.update_node_status(node.node_id, NodeBuildStatus.COMPILING)
                    await session_manager.broadcast_to_session(
                        session_id,
                        {
                            "stage": "build",
                            "type": "node_status",
                            "data": {
                                "node_id": node.node_id,
                                "status": "compiling",
                                "iteration": iteration + 1,
                                "max_iterations": build_settings.max_iterations,
                            },
                        },
                    )

                    compilation = loop.compile_firmware(code, node.node_id, board)

                    # Build memory usage
                    memory_usage = None
                    if compilation.memory:
                        memory_usage = MemoryUsage(
                            flash_used=compilation.memory.flash_usage,
                            flash_limit=board.flash_bytes,
                            ram_used=compilation.memory.ram_usage,
                            ram_limit=board.ram_bytes,
                        )

                    # Send compile result
                    await session_manager.broadcast_to_session(
                        session_id,
                        {
                            "stage": "build",
                            "type": "compile_result",
                            "data": {
                                "node_id": node.node_id,
                                "iteration": iteration + 1,
                                "success": compilation.success,
                                "output": compilation.errors or compilation.warnings or "",
                                "memory": memory_usage.model_dump() if memory_usage else None,
                            },
                        },
                    )

                    if not compilation.success:
                        # Store iteration result
                        iter_result = NodeIteration(
                            iteration=iteration + 1,
                            generated_code=code,
                            compile_output=compilation.errors,
                            compile_success=False,
                            error_message=compilation.errors,
                        )
                        node_state.iterations.append(iter_result)
                        previous_error = compilation.errors
                        continue

                    # === SIMULATING ===
                    session.update_node_status(node.node_id, NodeBuildStatus.SIMULATING)
                    await session_manager.broadcast_to_session(
                        session_id,
                        {
                            "stage": "build",
                            "type": "node_status",
                            "data": {
                                "node_id": node.node_id,
                                "status": "simulating",
                                "iteration": iteration + 1,
                                "max_iterations": build_settings.max_iterations,
                            },
                        },
                    )

                    from simulator.orchestrator import NodeConfig

                    sim_config = NodeConfig(
                        node_id=node.node_id,
                        firmware_path=compilation.elf_path,
                        timeout_seconds=build_settings.simulation_timeout_seconds,
                    )
                    print(f"  Running QEMU simulation for {node.node_id}...")
                    print(f"    Firmware: {compilation.elf_path}")
                    print(f"    Timeout: {build_settings.simulation_timeout_seconds}s")
                    simulation = await loop.qemu.run_single(sim_config, board)
                    print(f"  Simulation complete:")
                    print(f"    Success: {simulation.success}")
                    print(f"    Timeout: {simulation.timeout}")
                    print(f"    Output length: {len(simulation.stdout)} chars")
                    print(f"    Output preview: {simulation.stdout[:200] if simulation.stdout else '(empty)'}")

                    # Stream simulation output
                    if simulation.stdout:
                        for line in simulation.stdout.split("\n")[:20]:  # First 20 lines
                            if line.strip():
                                await session_manager.broadcast_to_session(
                                    session_id,
                                    {
                                        "stage": "build",
                                        "type": "simulation_output",
                                        "data": {
                                            "node_id": node.node_id,
                                            "iteration": iteration + 1,
                                            "line": line,
                                        },
                                    },
                                )

                    # === TESTING ===
                    session.update_node_status(node.node_id, NodeBuildStatus.TESTING)
                    await session_manager.broadcast_to_session(
                        session_id,
                        {
                            "stage": "build",
                            "type": "node_status",
                            "data": {
                                "node_id": node.node_id,
                                "status": "testing",
                                "iteration": iteration + 1,
                                "max_iterations": build_settings.max_iterations,
                            },
                        },
                    )

                    test_results = loop.check_output(simulation.stdout, node.assertions)

                    # Send test results
                    test_result_models = []
                    for t in test_results:
                        result_model = TestAssertionResult(
                            name=t.assertion.name,
                            pattern=t.assertion.pattern,
                            passed=t.passed,
                            matched_line=t.actual_output[:100] if t.passed else None,
                        )
                        test_result_models.append(result_model)

                        await session_manager.broadcast_to_session(
                            session_id,
                            {
                                "stage": "build",
                                "type": "test_result",
                                "data": {
                                    "node_id": node.node_id,
                                    "iteration": iteration + 1,
                                    "assertion": t.assertion.name,
                                    "pattern": t.assertion.pattern,
                                    "passed": t.passed,
                                    "matched_line": t.actual_output[:100] if t.passed else None,
                                },
                            },
                        )

                    # Store iteration result
                    iter_result = NodeIteration(
                        iteration=iteration + 1,
                        generated_code=code,
                        compile_output=compilation.warnings or "",
                        compile_success=True,
                        simulation_output=simulation.stdout,
                        simulation_success=simulation.success or simulation.timeout,
                        test_results=test_result_models,
                        memory_usage=memory_usage,
                    )
                    node_state.iterations.append(iter_result)

                    # Check if all tests passed
                    all_passed = all(t.passed for t in test_results if t.assertion.required)

                    if all_passed and (simulation.success or simulation.timeout):
                        success = True
                        node_state.final_binary_path = str(compilation.elf_path)
                        break
                    else:
                        # Build error context for retry
                        errors = []
                        if simulation.constraint_errors:
                            errors.append(
                                "MEMORY CONSTRAINT VIOLATIONS:\n"
                                + "\n".join(f"  - {e}" for e in simulation.constraint_errors)
                            )
                        failed_tests = [t for t in test_results if not t.passed]
                        if failed_tests:
                            errors.append(
                                "TEST FAILURES:\n"
                                + "\n".join(
                                    f"  - {t.assertion.name}: expected '{t.assertion.pattern}'"
                                    for t in failed_tests
                                )
                            )
                            errors.append(f"ACTUAL OUTPUT:\n{simulation.stdout[:1000]}")
                        previous_error = "\n\n".join(errors) if errors else "Unknown error"

                # Node build complete
                if success:
                    session.update_node_status(node.node_id, NodeBuildStatus.SUCCESS)
                    await session_manager.broadcast_to_session(
                        session_id,
                        {
                            "stage": "build",
                            "type": "node_complete",
                            "data": {
                                "node_id": node.node_id,
                                "status": "success",
                                "iterations_used": node_state.current_iteration,
                            },
                        },
                    )
                else:
                    session.update_node_status(node.node_id, NodeBuildStatus.FAILED)
                    await session_manager.broadcast_to_session(
                        session_id,
                        {
                            "stage": "build",
                            "type": "node_complete",
                            "data": {
                                "node_id": node.node_id,
                                "status": "failed",
                                "iterations_used": node_state.current_iteration,
                                "error": previous_error[:500] if previous_error else None,
                            },
                        },
                    )

            # Build complete
            loop.cleanup()

            # Determine final status
            succeeded = [
                n for n, s in session.build_state.nodes.items() if s.status == NodeBuildStatus.SUCCESS
            ]
            failed = [
                n for n, s in session.build_state.nodes.items() if s.status == NodeBuildStatus.FAILED
            ]
            skipped = [
                n for n, s in session.build_state.nodes.items() if s.status == NodeBuildStatus.SKIPPED
            ]

            if len(failed) == 0 and len(skipped) == 0:
                session.build_state.status = BuildSessionStatus.SUCCESS
            elif len(succeeded) > 0:
                session.build_state.status = BuildSessionStatus.PARTIAL
            else:
                session.build_state.status = BuildSessionStatus.FAILED

            session.build_state.completed_at = datetime.now()

            await session_manager.broadcast_to_session(
                session_id,
                {
                    "stage": "build",
                    "type": "build_complete",
                    "data": {
                        "status": session.build_state.status.value,
                        "succeeded": succeeded,
                        "failed": failed,
                        "skipped": skipped,
                    },
                },
            )

        except asyncio.CancelledError:
            session.build_state.status = BuildSessionStatus.CANCELLED
            session.build_state.completed_at = datetime.now()
            await session_manager.broadcast_to_session(
                session_id,
                {
                    "stage": "build",
                    "type": "build_complete",
                    "data": {"status": "cancelled"},
                },
            )
        except Exception as e:
            print(f"Build error: {e}")
            import traceback

            traceback.print_exc()
            session.build_state.status = BuildSessionStatus.FAILED
            session.build_state.error_message = str(e)
            session.build_state.completed_at = datetime.now()
            await session_manager.broadcast_to_session(
                session_id,
                {
                    "stage": "build",
                    "type": "error",
                    "data": {"message": str(e)},
                },
            )

    # Start task
    session.build_task = asyncio.create_task(run_build())

    return {
        "session_id": session_id,
        "status": "started",
        "nodes": [n["node_id"] for n in request.nodes],
        "message": f"Building firmware for {len(request.nodes)} node(s)",
    }


@router.get("/{session_id}/status")
async def get_build_status(session_id: str) -> BuildStatusResponse:
    """Get current build status with all node states."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    build = session.build_state
    current_node = None
    current_iteration = 0

    # Find currently building node
    for node_id, node_state in build.nodes.items():
        if node_state.status not in [
            NodeBuildStatus.SUCCESS,
            NodeBuildStatus.FAILED,
            NodeBuildStatus.SKIPPED,
            NodeBuildStatus.PENDING,
        ]:
            current_node = node_id
            current_iteration = node_state.current_iteration
            break

    return BuildStatusResponse(
        session_id=session_id,
        status=build.status.value,
        current_node=current_node,
        current_iteration=current_iteration,
        completed_count=build.completed_count,
        total_count=build.total_count,
        nodes=build.nodes,
    )


@router.get("/{session_id}/node/{node_id}")
async def get_node_status(session_id: str, node_id: str) -> NodeBuildState:
    """Get detailed status for a single node."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    node_state = session.get_node_state(node_id)
    if not node_state:
        raise HTTPException(status_code=404, detail="Node not found")

    return node_state


@router.post("/{session_id}/stop")
async def stop_build(session_id: str):
    """Cancel a running build."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.build_task and not session.build_task.done():
        session.build_task.cancel()
        session.build_state.status = BuildSessionStatus.CANCELLED
        return {"status": "cancelled"}

    return {"status": "not_running"}


@router.post("/{session_id}/node/{node_id}/retry")
async def retry_node(session_id: str, node_id: str):
    """Retry building a single failed node."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    node_state = session.get_node_state(node_id)
    if not node_state:
        raise HTTPException(status_code=404, detail="Node not found")

    if node_state.status != NodeBuildStatus.FAILED:
        raise HTTPException(status_code=400, detail="Node is not in failed state")

    # Reset node state
    node_state.status = NodeBuildStatus.PENDING
    node_state.current_iteration = 0
    node_state.iterations = []
    node_state.final_binary_path = None
    node_state.started_at = None
    node_state.completed_at = None

    # TODO: Re-trigger build for this node only
    # For now, return success and let frontend handle re-triggering full build
    return {"status": "reset", "message": "Node reset for retry"}


@router.post("/{session_id}/node/{node_id}/skip")
async def skip_node(session_id: str, node_id: str):
    """Skip a failed node and continue with others."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    node_state = session.get_node_state(node_id)
    if not node_state:
        raise HTTPException(status_code=404, detail="Node not found")

    if node_state.status not in [NodeBuildStatus.FAILED, NodeBuildStatus.PENDING]:
        raise HTTPException(status_code=400, detail="Node cannot be skipped")

    node_state.status = NodeBuildStatus.SKIPPED
    node_state.completed_at = datetime.now()

    await session_manager.broadcast_to_session(
        session_id,
        {
            "stage": "build",
            "type": "node_complete",
            "data": {
                "node_id": node_id,
                "status": "skipped",
            },
        },
    )

    return {"status": "skipped"}
