import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Device,
  Connection,
  ProjectSettings,
  CanvasViewState,
  SelectionState,
  ClipboardState,
  DesignMode,
  StageStatus,
  Stage,
  Position,
  BoardType,
} from '../types/design';

// Default project settings
const defaultSettings: ProjectSettings = {
  general: {
    name: 'Untitled Project',
    description: '',
    autoSave: true,
    autoSaveInterval: 30,
  },
  network: {
    protocol: 'mqtt',
    brokerUrl: 'localhost',
    brokerPort: 1883,
    qos: 1,
    topicPrefix: 'swarm',
    useTls: false,
  },
  hardware: {
    defaultBoard: 'lm3s6965',  // Best QEMU support
    serialBaud: 115200,
    autoDetectPorts: true,
    flashVerify: true,
  },
  cloud: {
    provider: 'aws',
    region: 'us-east-1',
    instanceType: 't3.micro',
    autoDestroy: true,
    autoDestroyTimeout: 30,
  },
  advanced: {
    maxBuildIterations: 3,
    simulationTimeout: 60,
    debugMode: false,
    verboseLogging: false,
  },
};

// Default canvas view state
const defaultCanvasView: CanvasViewState = {
  zoom: 1,
  center: { x: -79.9428, y: 40.4432 },  // Default to CMU coordinates
  gridSnap: false,  // Disabled - grid snap doesn't work with lat/lng
  gridSize: 20,
  showGrid: false,
};

// Default selection state
const defaultSelection: SelectionState = {
  selectedDeviceIds: [],
  selectedConnectionIds: [],
  isMultiSelectMode: false,
};

// Default stage statuses
const defaultStages: StageStatus[] = [
  { stage: 'design', status: 'active' },
  { stage: 'build', status: 'locked' },
  { stage: 'simulate', status: 'locked' },
  { stage: 'deploy', status: 'locked' },
];

interface DesignStore {
  // Project metadata
  projectId: string;
  mode: DesignMode;
  prompt: string;

  // Design data
  devices: Device[];
  connections: Connection[];

  // View state
  canvasView: CanvasViewState;
  selection: SelectionState;
  clipboard: ClipboardState;

  // Settings
  settings: ProjectSettings;
  settingsModalOpen: boolean;

  // Stage progression
  stages: StageStatus[];
  currentStage: Stage;

  // UI state
  isLoading: boolean;
  isDirty: boolean;
  lastSaved: number | null;

  // Project actions
  setProjectId: (id: string) => void;
  setMode: (mode: DesignMode) => void;
  setPrompt: (prompt: string) => void;
  resetProject: () => void;

  // Device actions
  addDevice: (device: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateDevice: (id: string, updates: Partial<Device>) => void;
  removeDevice: (id: string) => void;
  moveDevice: (id: string, position: Position) => void;
  duplicateDevices: (ids: string[]) => string[];

  // Connection actions
  addConnection: (connection: Omit<Connection, 'id'>) => string;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  removeConnection: (id: string) => void;
  removeConnectionsForDevice: (deviceId: string) => void;

  // Selection actions
  selectDevice: (id: string, addToSelection?: boolean) => void;
  selectDevices: (ids: string[]) => void;
  deselectDevice: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  toggleMultiSelectMode: (enabled: boolean) => void;
  setSelectionBox: (box: { start: Position; end: Position } | undefined) => void;

  // Clipboard actions
  copySelection: () => void;
  pasteClipboard: (offsetPosition?: Position) => void;
  deleteSelection: () => void;

  // Canvas view actions
  setZoom: (zoom: number) => void;
  setCenter: (center: Position) => void;
  toggleGridSnap: () => void;
  toggleShowGrid: () => void;
  setGridSize: (size: number) => void;
  fitToView: () => void;

  // Settings actions
  updateSettings: (settings: Partial<ProjectSettings>) => void;
  updateGeneralSettings: (settings: Partial<ProjectSettings['general']>) => void;
  updateNetworkSettings: (settings: Partial<ProjectSettings['network']>) => void;
  updateHardwareSettings: (settings: Partial<ProjectSettings['hardware']>) => void;
  updateCloudSettings: (settings: Partial<ProjectSettings['cloud']>) => void;
  updateAdvancedSettings: (settings: Partial<ProjectSettings['advanced']>) => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;

  // Stage actions
  setCurrentStage: (stage: Stage) => void;
  completeStage: (stage: Stage) => void;
  unlockStage: (stage: Stage) => void;
  canNavigateToStage: (stage: Stage) => boolean;

  // Persistence actions
  markDirty: () => void;
  markSaved: () => void;
  setLoading: (loading: boolean) => void;

  // Bulk import (from AI generation)
  importDesign: (devices: Device[], connections: Connection[]) => void;
}

// Generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useDesignStore = create<DesignStore>()(
  persist(
    (set, get) => ({
      // Initial state
      projectId: '',
      mode: 'manual',
      prompt: '',
      devices: [],
      connections: [],
      canvasView: defaultCanvasView,
      selection: defaultSelection,
      clipboard: { devices: [], connections: [] },
      settings: defaultSettings,
      settingsModalOpen: false,
      stages: defaultStages,
      currentStage: 'design',
      isLoading: false,
      isDirty: false,
      lastSaved: null,

      // Project actions
      setProjectId: (id) => set({ projectId: id }),

      setMode: (mode) => set({ mode, isDirty: true }),

      setPrompt: (prompt) => set({ prompt, isDirty: true }),

      resetProject: () => set({
        projectId: generateId(),
        mode: 'manual',
        prompt: '',
        devices: [],
        connections: [],
        canvasView: defaultCanvasView,
        selection: defaultSelection,
        clipboard: { devices: [], connections: [] },
        settings: defaultSettings,
        stages: defaultStages,
        currentStage: 'design',
        isDirty: false,
        lastSaved: null,
      }),

      // Device actions
      addDevice: (device) => {
        const id = generateId();
        const now = Date.now();
        const newDevice: Device = {
          ...device,
          id,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          devices: [...state.devices, newDevice],
          isDirty: true,
        }));
        return id;
      },

      updateDevice: (id, updates) => {
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === id ? { ...d, ...updates, updatedAt: Date.now() } : d
          ),
          isDirty: true,
        }));
      },

      removeDevice: (id) => {
        get().removeConnectionsForDevice(id);
        set((state) => ({
          devices: state.devices.filter((d) => d.id !== id),
          selection: {
            ...state.selection,
            selectedDeviceIds: state.selection.selectedDeviceIds.filter((did) => did !== id),
          },
          isDirty: true,
        }));
      },

      moveDevice: (id, position) => {
        // Don't apply grid snapping - we're using lat/lng coordinates on a map
        // Grid snapping only makes sense for pixel-based canvases
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === id ? { ...d, position, updatedAt: Date.now() } : d
          ),
          isDirty: true,
        }));
      },

      duplicateDevices: (ids) => {
        const state = get();
        const newIds: string[] = [];
        const newDevices: Device[] = [];
        const offset = 40;

        ids.forEach((id) => {
          const device = state.devices.find((d) => d.id === id);
          if (device) {
            const newId = generateId();
            newIds.push(newId);
            newDevices.push({
              ...device,
              id: newId,
              nodeId: `${device.nodeId}_copy`,
              name: `${device.name} (Copy)`,
              position: {
                x: device.position.x + offset,
                y: device.position.y + offset,
              },
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          }
        });

        set((state) => ({
          devices: [...state.devices, ...newDevices],
          isDirty: true,
        }));

        return newIds;
      },

      // Connection actions
      addConnection: (connection) => {
        const id = generateId();
        const newConnection: Connection = { ...connection, id };
        set((state) => ({
          connections: [...state.connections, newConnection],
          isDirty: true,
        }));
        return id;
      },

      updateConnection: (id, updates) => {
        set((state) => ({
          connections: state.connections.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
          isDirty: true,
        }));
      },

      removeConnection: (id) => {
        set((state) => ({
          connections: state.connections.filter((c) => c.id !== id),
          selection: {
            ...state.selection,
            selectedConnectionIds: state.selection.selectedConnectionIds.filter((cid) => cid !== id),
          },
          isDirty: true,
        }));
      },

      removeConnectionsForDevice: (deviceId) => {
        set((state) => ({
          connections: state.connections.filter(
            (c) => c.fromDeviceId !== deviceId && c.toDeviceId !== deviceId
          ),
          isDirty: true,
        }));
      },

      // Selection actions
      selectDevice: (id, addToSelection = false) => {
        set((state) => ({
          selection: {
            ...state.selection,
            selectedDeviceIds: addToSelection
              ? [...state.selection.selectedDeviceIds, id]
              : [id],
          },
        }));
      },

      selectDevices: (ids) => {
        set((state) => ({
          selection: {
            ...state.selection,
            selectedDeviceIds: ids,
          },
        }));
      },

      deselectDevice: (id) => {
        set((state) => ({
          selection: {
            ...state.selection,
            selectedDeviceIds: state.selection.selectedDeviceIds.filter((did) => did !== id),
          },
        }));
      },

      clearSelection: () => {
        set((state) => ({
          selection: {
            ...state.selection,
            selectedDeviceIds: [],
            selectedConnectionIds: [],
            selectionBox: undefined,
          },
        }));
      },

      selectAll: () => {
        set((state) => ({
          selection: {
            ...state.selection,
            selectedDeviceIds: state.devices.map((d) => d.id),
          },
        }));
      },

      toggleMultiSelectMode: (enabled) => {
        set((state) => ({
          selection: {
            ...state.selection,
            isMultiSelectMode: enabled,
          },
        }));
      },

      setSelectionBox: (box) => {
        set((state) => ({
          selection: {
            ...state.selection,
            selectionBox: box,
          },
        }));
      },

      // Clipboard actions
      copySelection: () => {
        const state = get();
        const selectedDevices = state.devices.filter((d) =>
          state.selection.selectedDeviceIds.includes(d.id)
        );
        const selectedIds = new Set(state.selection.selectedDeviceIds);
        const relatedConnections = state.connections.filter(
          (c) => selectedIds.has(c.fromDeviceId) && selectedIds.has(c.toDeviceId)
        );

        set({
          clipboard: {
            devices: selectedDevices,
            connections: relatedConnections,
          },
        });
      },

      pasteClipboard: (offsetPosition = { x: 50, y: 50 }) => {
        const state = get();
        const { devices, connections } = state.clipboard;

        if (devices.length === 0) return;

        const idMap = new Map<string, string>();
        const newDevices: Device[] = [];

        devices.forEach((device) => {
          const newId = generateId();
          idMap.set(device.id, newId);
          newDevices.push({
            ...device,
            id: newId,
            nodeId: `${device.nodeId}_paste`,
            position: {
              x: device.position.x + offsetPosition.x,
              y: device.position.y + offsetPosition.y,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        });

        const newConnections: Connection[] = connections.map((conn) => ({
          ...conn,
          id: generateId(),
          fromDeviceId: idMap.get(conn.fromDeviceId) || conn.fromDeviceId,
          toDeviceId: idMap.get(conn.toDeviceId) || conn.toDeviceId,
        }));

        set((state) => ({
          devices: [...state.devices, ...newDevices],
          connections: [...state.connections, ...newConnections],
          selection: {
            ...state.selection,
            selectedDeviceIds: newDevices.map((d) => d.id),
          },
          isDirty: true,
        }));
      },

      deleteSelection: () => {
        const state = get();
        const selectedIds = new Set(state.selection.selectedDeviceIds);

        set((currentState) => ({
          devices: currentState.devices.filter((d) => !selectedIds.has(d.id)),
          connections: currentState.connections.filter(
            (c) => !selectedIds.has(c.fromDeviceId) && !selectedIds.has(c.toDeviceId)
          ),
          selection: {
            ...currentState.selection,
            selectedDeviceIds: [],
            selectedConnectionIds: [],
          },
          isDirty: true,
        }));
      },

      // Canvas view actions
      setZoom: (zoom) => {
        set((state) => ({
          canvasView: { ...state.canvasView, zoom: Math.max(0.1, Math.min(3, zoom)) },
        }));
      },

      setCenter: (center) => {
        set((state) => ({
          canvasView: { ...state.canvasView, center },
        }));
      },

      toggleGridSnap: () => {
        set((state) => ({
          canvasView: { ...state.canvasView, gridSnap: !state.canvasView.gridSnap },
        }));
      },

      toggleShowGrid: () => {
        set((state) => ({
          canvasView: { ...state.canvasView, showGrid: !state.canvasView.showGrid },
        }));
      },

      setGridSize: (size) => {
        set((state) => ({
          canvasView: { ...state.canvasView, gridSize: size },
        }));
      },

      fitToView: () => {
        const state = get();
        if (state.devices.length === 0) {
          set((s) => ({
            canvasView: { ...s.canvasView, zoom: 1, center: { x: 0, y: 0 } },
          }));
          return;
        }

        const xs = state.devices.map((d) => d.position.x);
        const ys = state.devices.map((d) => d.position.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        set((s) => ({
          canvasView: {
            ...s.canvasView,
            center: { x: centerX, y: centerY },
            zoom: 1,
          },
        }));
      },

      // Settings actions
      updateSettings: (settings) => {
        set((state) => ({
          settings: { ...state.settings, ...settings },
          isDirty: true,
        }));
      },

      updateGeneralSettings: (settings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            general: { ...state.settings.general, ...settings },
          },
          isDirty: true,
        }));
      },

      updateNetworkSettings: (settings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            network: { ...state.settings.network, ...settings },
          },
          isDirty: true,
        }));
      },

      updateHardwareSettings: (settings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            hardware: { ...state.settings.hardware, ...settings },
          },
          isDirty: true,
        }));
      },

      updateCloudSettings: (settings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            cloud: { ...state.settings.cloud, ...settings },
          },
          isDirty: true,
        }));
      },

      updateAdvancedSettings: (settings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            advanced: { ...state.settings.advanced, ...settings },
          },
          isDirty: true,
        }));
      },

      openSettingsModal: () => set({ settingsModalOpen: true }),
      closeSettingsModal: () => set({ settingsModalOpen: false }),

      // Stage actions
      setCurrentStage: (stage) => {
        if (get().canNavigateToStage(stage)) {
          set({ currentStage: stage });
        }
      },

      completeStage: (stage) => {
        set((state) => ({
          stages: state.stages.map((s) =>
            s.stage === stage ? { ...s, status: 'completed', completedAt: Date.now() } : s
          ),
        }));

        // Unlock next stage
        const stageOrder: Stage[] = ['design', 'build', 'simulate', 'deploy'];
        const currentIndex = stageOrder.indexOf(stage);
        if (currentIndex < stageOrder.length - 1) {
          get().unlockStage(stageOrder[currentIndex + 1]);
        }
      },

      unlockStage: (stage) => {
        set((state) => ({
          stages: state.stages.map((s) =>
            s.stage === stage && s.status === 'locked' ? { ...s, status: 'available' } : s
          ),
        }));
      },

      canNavigateToStage: (stage) => {
        const state = get();
        const stageStatus = state.stages.find((s) => s.stage === stage);
        return stageStatus?.status !== 'locked';
      },

      // Persistence actions
      markDirty: () => set({ isDirty: true }),
      markSaved: () => set({ isDirty: false, lastSaved: Date.now() }),
      setLoading: (loading) => set({ isLoading: loading }),

      // Bulk import
      importDesign: (devices, connections) => {
        set({
          devices,
          connections,
          isDirty: true,
          selection: defaultSelection,
        });
      },
    }),
    {
      name: 'swarm-design-storage',
      partialize: (state) => ({
        projectId: state.projectId,
        mode: state.mode,
        prompt: state.prompt,
        devices: state.devices,
        connections: state.connections,
        settings: state.settings,
        canvasView: state.canvasView,
        stages: state.stages,
        lastSaved: state.lastSaved,
      }),
    }
  )
);

// Selector hooks for common patterns
export const useDevices = () => useDesignStore((state) => state.devices);
export const useConnections = () => useDesignStore((state) => state.connections);
export const useSelectedDevices = () => {
  const devices = useDesignStore((state) => state.devices);
  const selectedIds = useDesignStore((state) => state.selection.selectedDeviceIds);
  return devices.filter((d) => selectedIds.includes(d.id));
};
export const useSettings = () => useDesignStore((state) => state.settings);
export const useCanvasView = () => useDesignStore((state) => state.canvasView);
export const useCurrentStage = () => useDesignStore((state) => state.currentStage);
