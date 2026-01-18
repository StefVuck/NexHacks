/**
 * Build session state management hook
 */

import { useCallback, useEffect, useState } from 'react';
import {
  buildApi,
  BuildNode,
  BuildStatusResponse,
  NodeBuildState,
} from '../api/client';
import { useWebSocket, WSMessage } from './useWebSocket';

export interface BuildState {
  sessionId: string | null;
  status: BuildStatusResponse['status'];
  nodes: Record<string, NodeBuildState>;
  currentNode: string | null;
  currentIteration: number;
  completedCount: number;
  totalCount: number;
  error: string | null;
}

const initialState: BuildState = {
  sessionId: null,
  status: 'idle',
  nodes: {},
  currentNode: null,
  currentIteration: 0,
  completedCount: 0,
  totalCount: 0,
  error: null,
};

export function useBuild() {
  const [state, setState] = useState<BuildState>(initialState);
  const [isLoading, setIsLoading] = useState(false);

  // WebSocket message handler
  const handleMessage = useCallback((message: WSMessage) => {
    if (message.stage !== 'build') return;

    const { type, data } = message;

    switch (type) {
      case 'node_status': {
        const { node_id, status, iteration, max_iterations } = data as {
          node_id: string;
          status: string;
          iteration: number;
          max_iterations: number;
        };
        setState((prev) => ({
          ...prev,
          currentNode: node_id,
          currentIteration: iteration,
          nodes: {
            ...prev.nodes,
            [node_id]: {
              ...prev.nodes[node_id],
              status: status as NodeBuildState['status'],
              current_iteration: iteration,
              max_iterations,
            },
          },
        }));
        break;
      }

      case 'llm_request': {
        const { node_id, iteration, prompt } = data as {
          node_id: string;
          iteration: number;
          prompt: string;
        };
        setState((prev) => {
          const node = prev.nodes[node_id];
          if (!node) return prev;

          const iterations = [...node.iterations];
          const iterIndex = iterations.findIndex((i) => i.iteration === iteration);
          if (iterIndex >= 0) {
            iterations[iterIndex] = {
              ...iterations[iterIndex],
              llm_prompt: prompt,
            };
          } else {
            iterations.push({
              iteration,
              llm_prompt: prompt,
              compile_success: false,
              simulation_success: false,
              test_results: [],
            });
          }

          return {
            ...prev,
            nodes: {
              ...prev.nodes,
              [node_id]: { ...node, iterations },
            },
          };
        });
        break;
      }

      case 'llm_response': {
        const { node_id, iteration, response } = data as {
          node_id: string;
          iteration: number;
          response: string;
        };
        setState((prev) => {
          const node = prev.nodes[node_id];
          if (!node) return prev;

          const iterations = [...node.iterations];
          const iterIndex = iterations.findIndex((i) => i.iteration === iteration);
          if (iterIndex >= 0) {
            iterations[iterIndex] = {
              ...iterations[iterIndex],
              llm_response: response,
            };
          } else {
            iterations.push({
              iteration,
              llm_response: response,
              compile_success: false,
              simulation_success: false,
              test_results: [],
            });
          }

          return {
            ...prev,
            nodes: {
              ...prev.nodes,
              [node_id]: { ...node, iterations },
            },
          };
        });
        break;
      }

      case 'code_generated': {
        const { node_id, iteration, code_preview } = data as {
          node_id: string;
          iteration: number;
          code_preview: string;
        };
        setState((prev) => {
          const node = prev.nodes[node_id];
          if (!node) return prev;

          const iterations = [...node.iterations];
          const iterIndex = iterations.findIndex((i) => i.iteration === iteration);
          if (iterIndex >= 0) {
            iterations[iterIndex] = {
              ...iterations[iterIndex],
              generated_code: code_preview,
            };
          } else {
            iterations.push({
              iteration,
              generated_code: code_preview,
              compile_success: false,
              simulation_success: false,
              test_results: [],
            });
          }

          return {
            ...prev,
            nodes: {
              ...prev.nodes,
              [node_id]: { ...node, iterations },
            },
          };
        });
        break;
      }

      case 'compile_result': {
        const { node_id, iteration, success, output, memory } = data as {
          node_id: string;
          iteration: number;
          success: boolean;
          output: string;
          memory?: {
            flash_used: number;
            flash_limit: number;
            ram_used: number;
            ram_limit: number;
          };
        };
        setState((prev) => {
          const node = prev.nodes[node_id];
          if (!node) return prev;

          const iterations = [...node.iterations];
          const iterIndex = iterations.findIndex((i) => i.iteration === iteration);
          if (iterIndex >= 0) {
            iterations[iterIndex] = {
              ...iterations[iterIndex],
              compile_success: success,
              compile_output: output,
              memory_usage: memory,
            };
          }

          return {
            ...prev,
            nodes: {
              ...prev.nodes,
              [node_id]: { ...node, iterations },
            },
          };
        });
        break;
      }

      case 'simulation_output': {
        const { node_id, iteration, line } = data as {
          node_id: string;
          iteration: number;
          line: string;
        };
        setState((prev) => {
          const node = prev.nodes[node_id];
          if (!node) return prev;

          const iterations = [...node.iterations];
          const iterIndex = iterations.findIndex((i) => i.iteration === iteration);
          if (iterIndex >= 0) {
            const existing = iterations[iterIndex].simulation_output || '';
            iterations[iterIndex] = {
              ...iterations[iterIndex],
              simulation_output: existing + line + '\n',
            };
          }

          return {
            ...prev,
            nodes: {
              ...prev.nodes,
              [node_id]: { ...node, iterations },
            },
          };
        });
        break;
      }

      case 'test_result': {
        const { node_id, iteration, assertion, pattern, passed, matched_line } = data as {
          node_id: string;
          iteration: number;
          assertion: string;
          pattern: string;
          passed: boolean;
          matched_line?: string;
        };
        setState((prev) => {
          const node = prev.nodes[node_id];
          if (!node) return prev;

          const iterations = [...node.iterations];
          const iterIndex = iterations.findIndex((i) => i.iteration === iteration);
          if (iterIndex >= 0) {
            const testResults = [...iterations[iterIndex].test_results];
            const existingIndex = testResults.findIndex((t) => t.name === assertion);
            const result = { name: assertion, pattern, passed, matched_line };

            if (existingIndex >= 0) {
              testResults[existingIndex] = result;
            } else {
              testResults.push(result);
            }

            iterations[iterIndex] = {
              ...iterations[iterIndex],
              test_results: testResults,
            };
          }

          return {
            ...prev,
            nodes: {
              ...prev.nodes,
              [node_id]: { ...node, iterations },
            },
          };
        });
        break;
      }

      case 'node_complete': {
        const { node_id, status, iterations_used, error } = data as {
          node_id: string;
          status: 'success' | 'failed' | 'skipped';
          iterations_used?: number;
          error?: string;
        };
        setState((prev) => {
          const completedStatuses = ['success', 'failed', 'skipped'];
          const newCompletedCount = Object.values({
            ...prev.nodes,
            [node_id]: { ...prev.nodes[node_id], status },
          }).filter((n) => completedStatuses.includes(n.status)).length;

          return {
            ...prev,
            completedCount: newCompletedCount,
            nodes: {
              ...prev.nodes,
              [node_id]: {
                ...prev.nodes[node_id],
                status,
                current_iteration: iterations_used || prev.nodes[node_id]?.current_iteration || 0,
              },
            },
            error: error || prev.error,
          };
        });
        break;
      }

      case 'build_complete': {
        const { status } = data as {
          status: BuildStatusResponse['status'];
          succeeded: string[];
          failed: string[];
          skipped: string[];
        };
        setState((prev) => ({
          ...prev,
          status,
          currentNode: null,
        }));
        break;
      }

      case 'error': {
        const { message } = data as { message: string };
        setState((prev) => ({
          ...prev,
          status: 'failed',
          error: message,
        }));
        break;
      }
    }
  }, []);

  const { isConnected } = useWebSocket(state.sessionId, {
    onMessage: handleMessage,
  });

  // Start a new build
  const startBuild = useCallback(
    async (description: string, boardId: string, nodes: BuildNode[]) => {
      setIsLoading(true);
      setState(initialState);

      try {
        const response = await buildApi.start({
          description,
          board_id: boardId,
          nodes,
        });

        // Initialize state with pending nodes
        const initialNodes: Record<string, NodeBuildState> = {};
        for (const nodeId of response.nodes) {
          const nodeData = nodes.find((n) => n.node_id === nodeId);
          initialNodes[nodeId] = {
            node_id: nodeId,
            description: nodeData?.description || '',
            board_type: boardId,
            status: 'pending',
            current_iteration: 0,
            max_iterations: 3,
            iterations: [],
          };
        }

        setState({
          sessionId: response.session_id,
          status: 'running',
          nodes: initialNodes,
          currentNode: null,
          currentIteration: 0,
          completedCount: 0,
          totalCount: response.nodes.length,
          error: null,
        });

        return response.session_id;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to start build';
        setState((prev) => ({ ...prev, error: message, status: 'failed' }));
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Cancel build
  const cancelBuild = useCallback(async () => {
    if (!state.sessionId) return;

    try {
      await buildApi.stop(state.sessionId);
      setState((prev) => ({ ...prev, status: 'cancelled' }));
    } catch (error) {
      console.error('Failed to cancel build:', error);
    }
  }, [state.sessionId]);

  // Retry a failed node
  const retryNode = useCallback(
    async (nodeId: string) => {
      if (!state.sessionId) return;

      try {
        await buildApi.retryNode(state.sessionId, nodeId);
        setState((prev) => ({
          ...prev,
          nodes: {
            ...prev.nodes,
            [nodeId]: {
              ...prev.nodes[nodeId],
              status: 'pending',
              current_iteration: 0,
              iterations: [],
            },
          },
        }));
      } catch (error) {
        console.error('Failed to retry node:', error);
      }
    },
    [state.sessionId]
  );

  // Skip a failed node
  const skipNode = useCallback(
    async (nodeId: string) => {
      if (!state.sessionId) return;

      try {
        await buildApi.skipNode(state.sessionId, nodeId);
      } catch (error) {
        console.error('Failed to skip node:', error);
      }
    },
    [state.sessionId]
  );

  // Fetch current status
  const refreshStatus = useCallback(async () => {
    if (!state.sessionId) return;

    try {
      const status = await buildApi.getStatus(state.sessionId);
      setState((prev) => ({
        ...prev,
        status: status.status,
        nodes: status.nodes,
        currentNode: status.current_node || null,
        currentIteration: status.current_iteration,
        completedCount: status.completed_count,
        totalCount: status.total_count,
      }));
    } catch (error) {
      console.error('Failed to refresh status:', error);
    }
  }, [state.sessionId]);

  // Load existing session
  const loadSession = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    try {
      const status = await buildApi.getStatus(sessionId);
      setState({
        sessionId,
        status: status.status,
        nodes: status.nodes,
        currentNode: status.current_node || null,
        currentIteration: status.current_iteration,
        completedCount: status.completed_count,
        totalCount: status.total_count,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load session';
      setState((prev) => ({ ...prev, error: message }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    ...state,
    isLoading,
    isConnected,
    startBuild,
    cancelBuild,
    retryNode,
    skipNode,
    refreshStatus,
    loadSession,
  };
}
