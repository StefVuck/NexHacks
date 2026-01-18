import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types matching backend models
export interface DeviceInfo {
  port: string;
  board_type: string;
  chip_name: string;
  vid: string;
  pid: string;
  assigned_node: string | null;
}

export interface FlashProgress {
  port: string;
  node_id: string;
  status: 'idle' | 'preparing' | 'erasing' | 'writing' | 'verifying' | 'complete' | 'error';
  percent: number;
  stage: string;
  message?: string;
  error?: string;
}

export interface TerraformOutputs {
  server_ip: string;
  server_url: string;
  mqtt_broker: string;
  mqtt_port: number;
  mqtt_ws_url: string;
  ssh_command: string;
  instance_id: string;
  swarm_id: string;
}

export interface CloudStatus {
  status: 'idle' | 'initializing' | 'planning' | 'applying' | 'deployed' | 'destroying' | 'destroyed' | 'error';
  step?: string;
  message?: string;
  progress_percent: number;
  outputs?: TerraformOutputs;
}

export interface NodeTelemetry {
  node_id: string;
  online: boolean;
  last_seen?: string;
  readings: Record<string, number>;
  alerts: string[];
}

export interface DeploySettings {
  // Network tab
  wifi_ssid: string;
  wifi_password: string;
  mqtt_broker_override?: string;

  // Cloud tab
  aws_region: string;
  instance_type: string;
  auto_destroy_hours: number;

  // Hardware tab
  auto_scan_enabled: boolean;
  scan_interval_ms: number;
}

interface DeployState {
  // Session
  sessionId: string | null;
  swarmId: string | null;
  swarmName: string | null;

  // Devices
  devices: DeviceInfo[];
  isScanning: boolean;
  lastScanTime: number | null;

  // Assignments (port -> node_id)
  assignments: Record<string, string>;

  // Flash status (port -> FlashProgress)
  flashStatus: Record<string, FlashProgress>;

  // Cloud status
  cloudStatus: CloudStatus;
  cloudPrerequisites: {
    terraform_installed: boolean;
    aws_configured: boolean;
    ready: boolean;
  } | null;

  // Telemetry (node_id -> NodeTelemetry)
  telemetry: Record<string, NodeTelemetry>;

  // Settings
  settings: DeploySettings;
  settingsModalOpen: boolean;

  // UI state
  destroyConfirmOpen: boolean;

  // Actions
  setSession: (sessionId: string, swarmId: string, swarmName: string) => void;
  setDevices: (devices: DeviceInfo[]) => void;
  setScanning: (isScanning: boolean) => void;
  assignNode: (port: string, nodeId: string) => void;
  unassignNode: (port: string) => void;
  updateFlashStatus: (port: string, status: FlashProgress) => void;
  setCloudStatus: (status: CloudStatus) => void;
  setCloudPrerequisites: (prereqs: DeployState['cloudPrerequisites']) => void;
  updateTelemetry: (nodeId: string, telemetry: NodeTelemetry) => void;
  setSettings: (settings: Partial<DeploySettings>) => void;
  setSettingsModalOpen: (open: boolean) => void;
  setDestroyConfirmOpen: (open: boolean) => void;
  reset: () => void;
}

const defaultSettings: DeploySettings = {
  wifi_ssid: '',
  wifi_password: '',
  mqtt_broker_override: undefined,
  aws_region: 'us-east-1',
  instance_type: 't3.micro',
  auto_destroy_hours: 2,
  auto_scan_enabled: true,
  scan_interval_ms: 2000,
};

const defaultCloudStatus: CloudStatus = {
  status: 'idle',
  progress_percent: 0,
};

export const useDeployStore = create<DeployState>()(
  persist(
    (set) => ({
      // Initial state
      sessionId: null,
      swarmId: null,
      swarmName: null,
      devices: [],
      isScanning: false,
      lastScanTime: null,
      assignments: {},
      flashStatus: {},
      cloudStatus: defaultCloudStatus,
      cloudPrerequisites: null,
      telemetry: {},
      settings: defaultSettings,
      settingsModalOpen: false,
      destroyConfirmOpen: false,

      // Actions
      setSession: (sessionId, swarmId, swarmName) =>
        set({ sessionId, swarmId, swarmName }),

      setDevices: (devices) =>
        set((state) => ({
          devices: devices || [],
          lastScanTime: Date.now(),
          // Update assignments from devices
          assignments: (devices || []).reduce((acc, d) => {
            if (d.assigned_node) {
              acc[d.port] = d.assigned_node;
            }
            return acc;
          }, { ...state.assignments }),
        })),

      setScanning: (isScanning) =>
        set({ isScanning }),

      assignNode: (port, nodeId) =>
        set((state) => ({
          assignments: { ...state.assignments, [port]: nodeId },
          devices: state.devices.map((d) =>
            d.port === port ? { ...d, assigned_node: nodeId } : d
          ),
        })),

      unassignNode: (port) =>
        set((state) => {
          const { [port]: _, ...rest } = state.assignments;
          return {
            assignments: rest,
            devices: state.devices.map((d) =>
              d.port === port ? { ...d, assigned_node: null } : d
            ),
          };
        }),

      updateFlashStatus: (port, status) =>
        set((state) => ({
          flashStatus: { ...state.flashStatus, [port]: status },
        })),

      setCloudStatus: (status) =>
        set({ cloudStatus: status || defaultCloudStatus }),

      setCloudPrerequisites: (prereqs) =>
        set({ cloudPrerequisites: prereqs }),

      updateTelemetry: (nodeId, telemetry) =>
        set((state) => ({
          telemetry: { ...state.telemetry, [nodeId]: telemetry },
        })),

      setSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),

      setSettingsModalOpen: (open) =>
        set({ settingsModalOpen: open }),

      setDestroyConfirmOpen: (open) =>
        set({ destroyConfirmOpen: open }),

      reset: () =>
        set({
          devices: [],
          isScanning: false,
          lastScanTime: null,
          assignments: {},
          flashStatus: {},
          cloudStatus: defaultCloudStatus,
          telemetry: {},
          destroyConfirmOpen: false,
        }),
    }),
    {
      name: 'deploy-settings',
      // Only persist settings, not runtime state
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
