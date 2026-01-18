import { useCallback, useEffect, useRef } from 'react';
import {
  useDeployStore,
  DeviceInfo,
  FlashProgress,
  CloudStatus,
  NodeTelemetry,
} from '../stores/deployStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

interface WSMessage {
  stage: string;
  type: string;
  data: Record<string, unknown>;
}

export function useDeploy() {
  const store = useDeployStore();
  const wsRef = useRef<WebSocket | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // API helpers
  const fetchApi = useCallback(async <T>(
    path: string,
    options?: RequestInit
  ): Promise<T> => {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }
    return response.json();
  }, []);

  // Scan for devices
  const scanDevices = useCallback(async () => {
    if (!store.sessionId) return;
    try {
      store.setScanning(true);
      const devices = await fetchApi<DeviceInfo[]>(
        `/api/deploy/devices?session_id=${store.sessionId}`
      );
      store.setDevices(devices);
    } catch (error) {
      console.error('Failed to scan devices:', error);
    } finally {
      store.setScanning(false);
    }
  }, [store.sessionId, fetchApi]);

  // Assign node to device
  const assignNode = useCallback(async (port: string, nodeId: string) => {
    if (!store.sessionId) return;
    try {
      await fetchApi(`/api/deploy/${store.sessionId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ node_id: nodeId, port }),
      });
      store.assignNode(port, nodeId);
    } catch (error) {
      console.error('Failed to assign node:', error);
      throw error;
    }
  }, [store.sessionId, fetchApi]);

  // Unassign node from device
  const unassignNode = useCallback(async (port: string) => {
    if (!store.sessionId) return;
    try {
      await fetchApi(`/api/deploy/${store.sessionId}/assign/${encodeURIComponent(port)}`, {
        method: 'DELETE',
      });
      store.unassignNode(port);
    } catch (error) {
      console.error('Failed to unassign node:', error);
      throw error;
    }
  }, [store.sessionId, fetchApi]);

  // Flash single device
  const flashDevice = useCallback(async (port: string, nodeId: string) => {
    if (!store.sessionId) return;
    try {
      await fetchApi(`/api/deploy/${store.sessionId}/flash`, {
        method: 'POST',
        body: JSON.stringify({ node_id: nodeId, port }),
      });
    } catch (error) {
      console.error('Failed to start flash:', error);
      throw error;
    }
  }, [store.sessionId, fetchApi]);

  // Flash all assigned devices
  const flashAll = useCallback(async () => {
    if (!store.sessionId) return;
    try {
      await fetchApi(`/api/deploy/${store.sessionId}/flash/all`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to start flash all:', error);
      throw error;
    }
  }, [store.sessionId, fetchApi]);

  // Check cloud prerequisites
  const checkCloudPrerequisites = useCallback(async () => {
    try {
      const prereqs = await fetchApi<{
        terraform_installed: boolean;
        aws_configured: boolean;
        ready: boolean;
      }>('/api/deploy/cloud/check');
      store.setCloudPrerequisites(prereqs);
      return prereqs;
    } catch (error) {
      console.error('Failed to check cloud prerequisites:', error);
      return null;
    }
  }, [fetchApi]);

  // Start cloud deployment
  const startCloudDeploy = useCallback(async () => {
    if (!store.sessionId || !store.swarmId) return;

    const { settings } = store;

    try {
      await fetchApi(`/api/deploy/${store.sessionId}/cloud/start`, {
        method: 'POST',
        body: JSON.stringify({
          swarm_id: store.swarmId,
          region: settings.aws_region,
          instance_type: settings.instance_type,
          auto_destroy_hours: settings.auto_destroy_hours,
        }),
      });
    } catch (error) {
      console.error('Failed to start cloud deploy:', error);
      throw error;
    }
  }, [store.sessionId, store.swarmId, store.settings, fetchApi]);

  // Destroy cloud deployment
  const destroyCloudDeploy = useCallback(async () => {
    if (!store.sessionId) return;
    try {
      await fetchApi(`/api/deploy/${store.sessionId}/cloud/destroy?confirm=true`, {
        method: 'POST',
      });
      store.setDestroyConfirmOpen(false);
    } catch (error) {
      console.error('Failed to destroy cloud deploy:', error);
      throw error;
    }
  }, [store.sessionId, fetchApi]);

  // Get deployment status
  const getDeployStatus = useCallback(async () => {
    if (!store.sessionId) return null;
    try {
      const status = await fetchApi<{
        flash_status: Record<string, FlashProgress>;
        cloud_status: CloudStatus;
        devices: DeviceInfo[];
        assignments: Record<string, string>;
      }>(`/api/deploy/${store.sessionId}/status`);

      store.setDevices(status.devices || []);
      if (status.cloud_status) {
        store.setCloudStatus(status.cloud_status);
      }
      if (status.flash_status) {
        Object.entries(status.flash_status).forEach(([port, progress]) => {
          store.updateFlashStatus(port, progress);
        });
      }

      return status;
    } catch (error) {
      console.error('Failed to get deploy status:', error);
      return null;
    }
  }, [store.sessionId, fetchApi]);

  // Save settings to backend
  const saveSettings = useCallback(async () => {
    if (!store.sessionId) return;
    try {
      await fetchApi(`/api/deploy/${store.sessionId}/settings`, {
        method: 'POST',
        body: JSON.stringify(store.settings),
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }, [store.sessionId, store.settings, fetchApi]);

  // Simulate telemetry (single shot, for testing)
  const simulateTelemetry = useCallback(async () => {
    if (!store.sessionId) return;
    try {
      await fetchApi(`/api/deploy/${store.sessionId}/telemetry/simulate`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to simulate telemetry:', error);
      throw error;
    }
  }, [store.sessionId, fetchApi]);

  // Start continuous telemetry simulation
  const startTelemetrySimulation = useCallback(async (intervalSeconds: number = 2) => {
    if (!store.sessionId) return;
    try {
      await fetchApi(`/api/deploy/${store.sessionId}/telemetry/start?interval_seconds=${intervalSeconds}`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to start telemetry simulation:', error);
      throw error;
    }
  }, [store.sessionId, fetchApi]);

  // Stop continuous telemetry simulation
  const stopTelemetrySimulation = useCallback(async () => {
    if (!store.sessionId) return;
    try {
      await fetchApi(`/api/deploy/${store.sessionId}/telemetry/stop`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to stop telemetry simulation:', error);
    }
  }, [store.sessionId, fetchApi]);

  // Handle WebSocket messages
  const handleWSMessage = useCallback((message: WSMessage) => {
    if (message.stage !== 'deploy') return;

    const { type, data } = message;

    switch (type) {
      case 'devices_updated':
        store.setDevices(data.devices as DeviceInfo[]);
        break;

      case 'assignment_updated':
        store.assignNode(data.port as string, data.node_id as string);
        break;

      case 'assignment_removed':
        store.unassignNode(data.port as string);
        break;

      case 'flash_preparing':
      case 'flash_erasing':
      case 'flash_writing':
      case 'flash_verifying':
      case 'flash_complete':
      case 'flash_error':
        store.updateFlashStatus(data.port as string, data as FlashProgress);
        break;

      case 'cloud_status':
      case 'terraform_progress':
        store.setCloudStatus(data as CloudStatus);
        break;

      case 'terraform_outputs':
        store.setCloudStatus({
          ...store.cloudStatus,
          status: 'deployed',
          outputs: data as CloudStatus['outputs'],
        });
        break;

      case 'terraform_error':
        store.setCloudStatus({
          ...store.cloudStatus,
          status: 'error',
          message: data.error as string,
        });
        break;

      case 'telemetry':
        store.updateTelemetry(data.node_id as string, data as NodeTelemetry);
        break;

      case 'node_status':
        store.updateTelemetry(data.node_id as string, {
          node_id: data.node_id as string,
          online: data.online as boolean,
          last_seen: data.last_seen as string,
          readings: {},
          alerts: [],
        });
        break;

      case 'alert':
        const existing = store.telemetry[data.node_id as string];
        if (existing) {
          store.updateTelemetry(data.node_id as string, {
            ...existing,
            alerts: [...existing.alerts, data.message as string],
          });
        }
        break;
    }
  }, [store]);

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (!store.sessionId || wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_BASE}/ws/${store.sessionId}`);

    ws.onopen = () => {
      console.log('Deploy WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage;
        handleWSMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('Deploy WebSocket disconnected');
      // Attempt reconnection after 2 seconds
      setTimeout(() => {
        if (store.sessionId) {
          connectWebSocket();
        }
      }, 2000);
    };

    wsRef.current = ws;
  }, [store.sessionId, handleWSMessage]);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Start auto-scanning
  const startAutoScan = useCallback(() => {
    if (!store.settings.auto_scan_enabled) return;

    // Initial scan
    scanDevices();

    // Set up interval
    scanIntervalRef.current = window.setInterval(() => {
      scanDevices();
    }, store.settings.scan_interval_ms);
  }, [scanDevices, store.settings.auto_scan_enabled, store.settings.scan_interval_ms]);

  // Stop auto-scanning
  const stopAutoScan = useCallback(() => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  }, []);

  // Initialize when session changes
  useEffect(() => {
    if (store.sessionId) {
      connectWebSocket();
      checkCloudPrerequisites();
      getDeployStatus();
      startAutoScan();
    }

    return () => {
      disconnectWebSocket();
      stopAutoScan();
    };
  }, [store.sessionId]);

  // Update auto-scan when settings change
  useEffect(() => {
    stopAutoScan();
    if (store.sessionId && store.settings.auto_scan_enabled) {
      startAutoScan();
    }
  }, [store.settings.auto_scan_enabled, store.settings.scan_interval_ms]);

  // Check if deploy button should be enabled
  const cloudStatusValue = store.cloudStatus?.status || 'idle';

  // Auto-start telemetry simulation when deployed
  const telemetryStartedRef = useRef(false);
  useEffect(() => {
    if (cloudStatusValue === 'deployed' && !telemetryStartedRef.current && store.sessionId) {
      telemetryStartedRef.current = true;
      // Start continuous telemetry simulation
      fetchApi(`/api/deploy/${store.sessionId}/telemetry/start?interval_seconds=2`, {
        method: 'POST',
      }).catch(console.error);
    } else if (cloudStatusValue !== 'deployed') {
      telemetryStartedRef.current = false;
    }
  }, [cloudStatusValue, store.sessionId]);
  // For demo mode, allow deployment without WiFi settings
  // In production, WiFi is required for real hardware
  const canDeploy = store.cloudPrerequisites?.ready === true &&
    cloudStatusValue === 'idle';

  // Check if destroy button should be enabled
  const canDestroy = cloudStatusValue === 'deployed' ||
    cloudStatusValue === 'error';

  // Check if we're in a deployable state
  const isDeploying = ['initializing', 'planning', 'applying'].includes(cloudStatusValue);
  const isDestroying = cloudStatusValue === 'destroying';

  return {
    // State from store
    ...store,

    // Computed
    canDeploy,
    canDestroy,
    isDeploying,
    isDestroying,

    // Actions
    scanDevices,
    assignNode,
    unassignNode,
    flashDevice,
    flashAll,
    checkCloudPrerequisites,
    startCloudDeploy,
    destroyCloudDeploy,
    getDeployStatus,
    saveSettings,
    simulateTelemetry,
    connectWebSocket,
    disconnectWebSocket,
    startTelemetrySimulation,
    stopTelemetrySimulation,
  };
}
