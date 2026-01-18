/**
 * Simulation session state management hook
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import {
  simulateApi,
  SimulateStatusResponse,
  SimulationMessage,
  NodeSimulationState,
} from '../api/client';
import { useWebSocket, WSMessage } from './useWebSocket';

export interface SimulationState {
  sessionId: string | null;
  status: SimulateStatusResponse['status'];
  speed: number;
  elapsedTimeMs: number;
  nodes: Record<string, NodeSimulationState>;
  messages: SimulationMessage[];
  testSummary: Record<string, boolean>;
  alerts: string[];
  error: string | null;
}

const initialState: SimulationState = {
  sessionId: null,
  status: 'idle',
  speed: 1,
  elapsedTimeMs: 0,
  nodes: {},
  messages: [],
  testSummary: {},
  alerts: [],
  error: null,
};

export function useSimulation() {
  const [state, setState] = useState<SimulationState>(initialState);
  const [isLoading, setIsLoading] = useState(false);

  // WebSocket message handler
  const handleMessage = useCallback((message: WSMessage) => {
    if (message.stage !== 'simulate') return;

    const { type, data } = message;

    switch (type) {
      case 'started': {
        const { nodes, speed } = data as {
          nodes: string[];
          speed: number;
          timeout_seconds: number;
        };
        setState((prev) => ({
          ...prev,
          status: 'running',
          speed,
          nodes: Object.fromEntries(
            nodes.map((id) => [
              id,
              {
                node_id: id,
                status: 'offline',
                latest_readings: {},
                message_count: 0,
              },
            ])
          ),
        }));
        break;
      }

      case 'node_status': {
        const { node_id, status, readings } = data as {
          node_id: string;
          status: 'online' | 'offline' | 'error';
          readings?: Record<string, number | string>;
        };
        setState((prev) => ({
          ...prev,
          nodes: {
            ...prev.nodes,
            [node_id]: {
              ...prev.nodes[node_id],
              node_id,
              status,
              latest_readings: readings || prev.nodes[node_id]?.latest_readings || {},
            },
          },
        }));
        break;
      }

      case 'message': {
        const msg = data as {
          from: string;
          to: string;
          topic?: string;
          payload: Record<string, unknown>;
          timestamp: number;
        };
        const simMessage: SimulationMessage = {
          timestamp: new Date(msg.timestamp).toISOString(),
          from_node: msg.from,
          to_node: msg.to,
          topic: msg.topic,
          payload: msg.payload,
        };
        setState((prev) => ({
          ...prev,
          messages: [...prev.messages.slice(-99), simMessage], // Keep last 100
          nodes: {
            ...prev.nodes,
            [msg.from]: {
              ...prev.nodes[msg.from],
              message_count: (prev.nodes[msg.from]?.message_count || 0) + 1,
            },
          },
        }));
        break;
      }

      case 'test_result': {
        const { assertion, passed } = data as {
          assertion: string;
          passed: boolean;
        };
        setState((prev) => ({
          ...prev,
          testSummary: {
            ...prev.testSummary,
            [assertion]: passed,
          },
        }));
        break;
      }

      case 'alert': {
        const { message } = data as { type: string; message: string; node_id?: string };
        setState((prev) => ({
          ...prev,
          alerts: [...prev.alerts, message],
        }));
        break;
      }

      case 'paused': {
        setState((prev) => ({
          ...prev,
          status: 'paused',
        }));
        break;
      }

      case 'resumed': {
        setState((prev) => ({
          ...prev,
          status: 'running',
        }));
        break;
      }

      case 'stopped': {
        setState((prev) => ({
          ...prev,
          status: 'stopped',
        }));
        break;
      }

      case 'speed_changed': {
        const { speed } = data as { speed: number };
        setState((prev) => ({
          ...prev,
          speed,
        }));
        break;
      }

      case 'tick': {
        const { elapsed_ms } = data as { elapsed_ms: number };
        setState((prev) => ({
          ...prev,
          elapsedTimeMs: elapsed_ms,
        }));
        break;
      }

      case 'complete': {
        const { elapsed_ms, tests_passed, tests_failed } = data as {
          elapsed_ms: number;
          messages_sent: number;
          tests_passed: number;
          tests_failed: number;
        };
        setState((prev) => ({
          ...prev,
          status: 'completed',
          elapsedTimeMs: elapsed_ms,
        }));
        break;
      }

      case 'error': {
        const { message } = data as { message: string };
        setState((prev) => ({
          ...prev,
          status: 'stopped',
          error: message,
        }));
        break;
      }
    }
  }, []);

  const { isConnected } = useWebSocket(state.sessionId, {
    onMessage: handleMessage,
  });

  // Local timer to update elapsed time while running
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (state.status === 'running') {
      // Capture start time when simulation starts running
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now() - state.elapsedTimeMs;
      }

      const interval = setInterval(() => {
        const elapsed = Date.now() - (startTimeRef.current || Date.now());
        setState((prev) => ({
          ...prev,
          elapsedTimeMs: elapsed,
        }));
      }, 100); // Update every 100ms

      return () => clearInterval(interval);
    } else if (state.status === 'paused') {
      // Keep the current elapsed time but stop the timer
      startTimeRef.current = null;
    } else if (state.status === 'idle' || state.status === 'stopped') {
      // Reset timer reference
      startTimeRef.current = null;
    }
  }, [state.status]);

  // Start simulation
  const startSimulation = useCallback(
    async (sessionId: string, timeoutSeconds = 30, speed = 1) => {
      setIsLoading(true);
      setState((prev) => ({
        ...initialState,
        sessionId,
      }));

      try {
        await simulateApi.start({
          session_id: sessionId,
          timeout_seconds: timeoutSeconds,
          speed,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to start simulation';
        setState((prev) => ({ ...prev, error: message, status: 'stopped' }));
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Pause simulation
  const pauseSimulation = useCallback(async () => {
    if (!state.sessionId) return;

    try {
      await simulateApi.pause(state.sessionId);
    } catch (error) {
      console.error('Failed to pause simulation:', error);
    }
  }, [state.sessionId]);

  // Resume simulation
  const resumeSimulation = useCallback(async () => {
    if (!state.sessionId) return;

    try {
      await simulateApi.resume(state.sessionId);
    } catch (error) {
      console.error('Failed to resume simulation:', error);
    }
  }, [state.sessionId]);

  // Stop simulation
  const stopSimulation = useCallback(async () => {
    if (!state.sessionId) return;

    try {
      await simulateApi.stop(state.sessionId);
    } catch (error) {
      console.error('Failed to stop simulation:', error);
    }
  }, [state.sessionId]);

  // Set speed
  const setSpeed = useCallback(
    async (speed: number) => {
      if (!state.sessionId) return;

      try {
        await simulateApi.setSpeed(state.sessionId, speed);
      } catch (error) {
        console.error('Failed to set speed:', error);
      }
    },
    [state.sessionId]
  );

  // Fetch current status
  const refreshStatus = useCallback(async () => {
    if (!state.sessionId) return;

    try {
      const status = await simulateApi.getStatus(state.sessionId);
      setState((prev) => ({
        ...prev,
        status: status.status,
        speed: status.speed,
        elapsedTimeMs: status.elapsed_time_ms,
        nodes: status.nodes,
        testSummary: status.test_summary,
      }));
    } catch (error) {
      console.error('Failed to refresh status:', error);
    }
  }, [state.sessionId]);

  // Load messages
  const loadMessages = useCallback(
    async (nodeId?: string, limit = 100) => {
      if (!state.sessionId) return;

      try {
        const messages = await simulateApi.getMessages(state.sessionId, nodeId, limit);
        setState((prev) => ({
          ...prev,
          messages,
        }));
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    },
    [state.sessionId]
  );

  // Initialize with session
  const initSession = useCallback((sessionId: string) => {
    setState((prev) => ({
      ...prev,
      sessionId,
    }));
  }, []);

  return {
    ...state,
    isLoading,
    isConnected,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
    setSpeed,
    refreshStatus,
    loadMessages,
    initSession,
  };
}
