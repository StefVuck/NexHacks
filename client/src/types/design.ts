// Device board types supported by Swarm Architect
// These must match backend board IDs in agent/boards.py
export type BoardType =
  | 'lm3s6965'      // Best QEMU support, recommended for simulation
  | 'esp32'
  | 'esp32s3'       // Note: no underscore
  | 'esp32c3'
  | 'stm32f103c8'   // Blue Pill
  | 'stm32f401re'   // Nucleo
  | 'stm32f407vg'   // Discovery
  | 'stm32l476rg'
  | 'arduino_uno'
  | 'arduino_nano'
  | 'arduino_mega'
  | 'arduino_due'
  | 'server';       // Not a real board, used for aggregation server

// Communication protocols
export type Protocol = 'mqtt' | 'http';

// Cloud providers
export type CloudProvider = 'aws' | 'gcp' | 'azure';

// MQTT QoS levels
export type QoSLevel = 0 | 1 | 2;

// Device feature configuration
export interface DeviceFeature {
  id: string;
  name: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

// Test assertion for verification
export interface TestAssertion {
  id: string;
  description: string;
  condition: string;
  expectedValue?: string;
}

// Device position on canvas
export interface Position {
  x: number;
  y: number;
}

// Geographic coordinates for map placement
export interface GeoPosition {
  longitude: number;
  latitude: number;
}

// Device node in the design
export interface Device {
  id: string;
  nodeId: string;
  name: string;
  description: string;
  boardType: BoardType;
  position: Position;
  geoPosition?: GeoPosition;
  features: DeviceFeature[];
  assertions: TestAssertion[];
  createdAt: number;
  updatedAt: number;
}

// Connection between devices
export interface Connection {
  id: string;
  fromDeviceId: string;
  toDeviceId: string;
  fromPort?: string;
  toPort?: string;
  protocol: Protocol;
  label?: string;
}

// Project general settings
export interface GeneralSettings {
  name: string;
  description: string;
  autoSave: boolean;
  autoSaveInterval: number; // in seconds
}

// Network/communication settings
export interface NetworkSettings {
  protocol: Protocol;
  brokerUrl: string;
  brokerPort: number;
  qos: QoSLevel;
  topicPrefix: string;
  useTls: boolean;
  username?: string;
  password?: string;
}

// Hardware/flashing settings
export interface HardwareSettings {
  defaultBoard: BoardType;
  serialBaud: number;
  autoDetectPorts: boolean;
  flashVerify: boolean;
}

// Cloud deployment settings
export interface CloudSettings {
  provider: CloudProvider;
  region: string;
  instanceType: string;
  autoDestroy: boolean;
  autoDestroyTimeout: number; // in minutes
}

// Advanced/debug settings
export interface AdvancedSettings {
  maxBuildIterations: number;
  simulationTimeout: number; // in seconds
  debugMode: boolean;
  verboseLogging: boolean;
}

// Combined project settings
export interface ProjectSettings {
  general: GeneralSettings;
  network: NetworkSettings;
  hardware: HardwareSettings;
  cloud: CloudSettings;
  advanced: AdvancedSettings;
}

// Design mode: AI-generated from prompt or manual placement
export type DesignMode = 'ai' | 'manual';

// Canvas view state
export interface CanvasViewState {
  zoom: number;
  center: Position;
  gridSnap: boolean;
  gridSize: number;
  showGrid: boolean;
}

// Selection state for multi-select
export interface SelectionState {
  selectedDeviceIds: string[];
  selectedConnectionIds: string[];
  isMultiSelectMode: boolean;
  selectionBox?: {
    start: Position;
    end: Position;
  };
}

// Clipboard for copy/paste
export interface ClipboardState {
  devices: Device[];
  connections: Connection[];
}

// Stage progression
export type Stage = 'design' | 'build' | 'simulate' | 'deploy';

// Stage status for progress indicator
export interface StageStatus {
  stage: Stage;
  status: 'locked' | 'available' | 'active' | 'completed';
  completedAt?: number;
}

// Full design project state
export interface DesignProject {
  id: string;
  mode: DesignMode;
  prompt: string;
  devices: Device[];
  connections: Connection[];
  settings: ProjectSettings;
  canvasView: CanvasViewState;
  stages: StageStatus[];
  createdAt: number;
  updatedAt: number;
}

// Device palette item (template for creating devices)
export interface DevicePaletteItem {
  boardType: BoardType;
  name: string;
  description: string;
  icon: string;
  defaultFeatures: Omit<DeviceFeature, 'id'>[];
  specs: {
    cpu?: string;
    memory?: string;
    connectivity?: string[];
    pins?: number;
  };
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ParsePromptResponse {
  devices: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>[];
  connections: Omit<Connection, 'id'>[];
  suggestedSettings?: Partial<ProjectSettings>;
}

export interface SaveDesignResponse {
  id: string;
  savedAt: number;
}
