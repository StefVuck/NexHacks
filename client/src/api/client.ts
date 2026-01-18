/**
 * API client for Swarm Architect backend
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// === Build API ===

export interface BuildNode {
  node_id: string;
  description: string;
  assertions: Array<{ name: string; pattern: string; required?: boolean }>;
}

export interface BuildStartRequest {
  description: string;
  board_id: string;
  nodes: BuildNode[];
  settings?: {
    max_iterations?: number;
    simulation_timeout_seconds?: number;
  };
}

export interface MemoryUsage {
  flash_used: number;
  flash_limit: number;
  ram_used: number;
  ram_limit: number;
}

export interface TestAssertionResult {
  name: string;
  pattern: string;
  passed: boolean;
  matched_line?: string;
}

export interface NodeIteration {
  iteration: number;
  generated_code?: string;
  compile_output?: string;
  compile_success: boolean;
  simulation_output?: string;
  simulation_success: boolean;
  test_results: TestAssertionResult[];
  error_message?: string;
  memory_usage?: MemoryUsage;
}

export interface NodeBuildState {
  node_id: string;
  description: string;
  board_type: string;
  status: 'pending' | 'generating' | 'compiling' | 'simulating' | 'testing' | 'success' | 'failed' | 'skipped';
  current_iteration: number;
  max_iterations: number;
  iterations: NodeIteration[];
  final_binary_path?: string;
}

export interface BuildStatusResponse {
  session_id: string;
  status: 'idle' | 'running' | 'success' | 'partial' | 'failed' | 'cancelled';
  current_node?: string;
  current_iteration: number;
  completed_count: number;
  total_count: number;
  nodes: Record<string, NodeBuildState>;
}

export const buildApi = {
  start: async (request: BuildStartRequest) => {
    const response = await api.post('/api/build/start', request);
    return response.data as { session_id: string; status: string; nodes: string[] };
  },

  getStatus: async (sessionId: string) => {
    const response = await api.get(`/api/build/${sessionId}/status`);
    return response.data as BuildStatusResponse;
  },

  getNodeStatus: async (sessionId: string, nodeId: string) => {
    const response = await api.get(`/api/build/${sessionId}/node/${nodeId}`);
    return response.data as NodeBuildState;
  },

  stop: async (sessionId: string) => {
    const response = await api.post(`/api/build/${sessionId}/stop`);
    return response.data;
  },

  retryNode: async (sessionId: string, nodeId: string) => {
    const response = await api.post(`/api/build/${sessionId}/node/${nodeId}/retry`);
    return response.data;
  },

  skipNode: async (sessionId: string, nodeId: string) => {
    const response = await api.post(`/api/build/${sessionId}/node/${nodeId}/skip`);
    return response.data;
  },
};

// === Simulate API ===

export interface SimulateStartRequest {
  session_id: string;
  timeout_seconds?: number;
  speed?: number;
}

export interface NodeSimulationState {
  node_id: string;
  status: 'online' | 'offline' | 'error';
  latest_output?: string;
  latest_readings: Record<string, number | string>;
  message_count: number;
}

export interface SimulationMessage {
  timestamp: string;
  from_node: string;
  to_node: string;
  payload: Record<string, unknown>;
  topic?: string;
}

export interface SimulateStatusResponse {
  session_id: string;
  status: 'idle' | 'running' | 'paused' | 'stopped' | 'completed';
  speed: number;
  elapsed_time_ms: number;
  nodes: Record<string, NodeSimulationState>;
  message_count: number;
  test_summary: Record<string, boolean>;
}

export const simulateApi = {
  start: async (request: SimulateStartRequest) => {
    const response = await api.post('/api/simulate/start', request);
    return response.data;
  },

  pause: async (sessionId: string) => {
    const response = await api.post(`/api/simulate/${sessionId}/pause`);
    return response.data;
  },

  resume: async (sessionId: string) => {
    const response = await api.post(`/api/simulate/${sessionId}/resume`);
    return response.data;
  },

  stop: async (sessionId: string) => {
    const response = await api.post(`/api/simulate/${sessionId}/stop`);
    return response.data;
  },

  setSpeed: async (sessionId: string, speed: number) => {
    const response = await api.post(`/api/simulate/${sessionId}/speed`, { speed });
    return response.data;
  },

  getStatus: async (sessionId: string) => {
    const response = await api.get(`/api/simulate/${sessionId}/status`);
    return response.data as SimulateStatusResponse;
  },

  getMessages: async (sessionId: string, nodeId?: string, limit = 100) => {
    const params = new URLSearchParams();
    if (nodeId) params.append('node_id', nodeId);
    params.append('limit', limit.toString());
    const response = await api.get(`/api/simulate/${sessionId}/messages?${params}`);
    return response.data as SimulationMessage[];
  },

  getNodeState: async (sessionId: string, nodeId: string) => {
    const response = await api.get(`/api/simulate/${sessionId}/node/${nodeId}`);
    return response.data as NodeSimulationState;
  },
};

// WebSocket URL
export const getWebSocketUrl = (sessionId: string) => {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = import.meta.env.VITE_WS_HOST || 'localhost:8000';
  return `${wsProtocol}//${wsHost}/ws/${sessionId}`;
};
