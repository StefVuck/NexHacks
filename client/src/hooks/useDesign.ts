import { useCallback, useEffect } from 'react';
import { useDesignStore } from '../stores/designStore';
import { buildApi } from '../api/client';
import type {
  Device,
  Connection,
  ParsePromptResponse,
  SaveDesignResponse,
  TestAssertion,
} from '../types/design';
import type { BuildNode } from '../api/client';

// TODO: Replace with actual API client for other methods
const API_BASE = '/api';

/**
 * Hook for design-related API operations
 */
export function useDesign(projectId?: string) {
  const {
    setProjectId,
    setLoading,
    markSaved,
    markDirty,
    importDesign,
    devices,
    connections,
    settings,
    mode,
    prompt,
  } = useDesignStore();

  // Load project on mount if projectId provided
  useEffect(() => {
    if (projectId) {
      setProjectId(projectId);
      loadProject(projectId);
    }
  }, [projectId]);

  /**
   * Load an existing design project
   */
  const loadProject = useCallback(async (id: string) => {
    setLoading(true);
    try {
      // TODO: API call to GET /api/design/{id}
      console.log('Load project:', id);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  }, [setLoading, importDesign]);

  /**
   * Save the current design
   */
  const saveProject = useCallback(async (): Promise<SaveDesignResponse | null> => {
    setLoading(true);
    try {
      // TODO: API call to POST /api/design/save
      console.log('Save project - TODO: implement API call');
      markSaved();
      return { id: projectId || 'mock-id', savedAt: Date.now() };
    } catch (error) {
      console.error('Failed to save project:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [devices, connections, settings, mode, prompt, setLoading, markSaved, projectId]);

  /**
   * Parse a natural language prompt into device layout
   */
  const parsePrompt = useCallback(async (promptText: string): Promise<ParsePromptResponse | null> => {
    setLoading(true);
    try {
      console.log('Parse prompt:', promptText);
      // Mock response for development
      return {
        devices: [
          {
            nodeId: 'sensor_1',
            name: 'Temperature Sensor 1',
            description: 'Warehouse corner sensor',
            boardType: 'esp32',
            position: { x: 100, y: 100 },
            features: [
              { id: '1', name: 'temperature', enabled: true },
              { id: '2', name: 'wifi', enabled: true },
            ],
            assertions: [
              { id: '1', description: 'Reports temperature', condition: 'output contains "temp"' },
            ],
          },
        ],
        connections: [],
        suggestedSettings: {
          network: {
            protocol: 'mqtt',
            brokerUrl: 'localhost',
            brokerPort: 1883,
            qos: 1,
            topicPrefix: 'warehouse',
            useTls: false,
          },
        },
      };
    } catch (error) {
      console.error('Failed to parse prompt:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  /**
   * Get LLM suggestions for device layout based on prompt
   */
  const suggestLayout = useCallback(async (promptText: string): Promise<ParsePromptResponse | null> => {
    setLoading(true);
    try {
      console.log('Suggest layout:', promptText);
      return null;
    } catch (error) {
      console.error('Failed to get layout suggestion:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  /**
   * Proceed to build stage
   * Returns session ID if successful, null/false otherwise
   */
  const proceedToBuild = useCallback(async () => {
    // Validate design has at least one device
    if (devices.length === 0) {
      console.error('Cannot proceed: no devices in design');
      return null;
    }

    setLoading(true);
    try {
      // Save current design first
      const saved = await saveProject();
      if (!saved) {
        console.error('Failed to save before proceeding');
        return null;
      }

      // Map devices to BuildNodes
      const buildNodes: BuildNode[] = devices.map(d => ({
        node_id: d.nodeId,
        description: d.description || d.name,
        assertions: d.assertions.map(a => ({
          name: a.description,
          pattern: a.condition,
          required: true // Default to required
        }))
      }));

      // Call the REAL API to start build
      // Use the first device's board type as the main board type (or settings default)
      const boardId = devices[0].boardType || settings.hardware.defaultBoard;

      const response = await buildApi.start({
        description: settings.general.description || 'Swarm Build',
        board_id: boardId,
        nodes: buildNodes,
      });

      console.log('Build started successfully:', response);
      return response.session_id;

    } catch (error) {
      console.error('Failed to start build:', error);
      // Fallback for demo/offline mode if API fails?
      // No, user needs to know it failed.
      // But for development continuation request...
      // We throw.
      throw error;
    } finally {
      setLoading(false);
    }
  }, [devices, saveProject, settings.hardware.defaultBoard, settings.general.description, setLoading]);

  return {
    loadProject,
    saveProject,
    parsePrompt,
    suggestLayout,
    proceedToBuild,
  };
}

/**
 * Hook for auto-save functionality
 */
export function useAutoSave() {
  const isDirty = useDesignStore((state) => state.isDirty);
  const autoSave = useDesignStore((state) => state.settings.general.autoSave);
  const autoSaveInterval = useDesignStore((state) => state.settings.general.autoSaveInterval);
  const { saveProject } = useDesign();

  useEffect(() => {
    if (!autoSave || !isDirty) return;

    const timer = setTimeout(() => {
      saveProject();
    }, autoSaveInterval * 1000);

    return () => clearTimeout(timer);
  }, [autoSave, autoSaveInterval, isDirty, saveProject]);
}

/**
 * Hook for keyboard shortcuts
 */
export function useDesignKeyboard() {
  const {
    copySelection,
    pasteClipboard,
    deleteSelection,
    selectAll,
    clearSelection,
  } = useDesignStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMeta = e.metaKey || e.ctrlKey;

      // Copy: Cmd/Ctrl + C
      if (isMeta && e.key === 'c') {
        e.preventDefault();
        copySelection();
      }

      // Paste: Cmd/Ctrl + V
      if (isMeta && e.key === 'v') {
        e.preventDefault();
        pasteClipboard();
      }

      // Delete: Backspace or Delete
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        deleteSelection();
      }

      // Select all: Cmd/Ctrl + A
      if (isMeta && e.key === 'a') {
        e.preventDefault();
        selectAll();
      }

      // Escape: Clear selection
      if (e.key === 'Escape') {
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copySelection, pasteClipboard, deleteSelection, selectAll, clearSelection]);
}

export default useDesign;
