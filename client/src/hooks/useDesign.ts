import { useCallback, useEffect } from 'react';
import { useDesignStore } from '../stores/designStore';
import { useProjectStore } from '../stores/projectStore';
import { buildApi } from '../api/client';
import type {
  Device,
  Connection,
  ParsePromptResponse,
  SaveDesignResponse,
  TestAssertion,
} from '../types/design';
import type { BuildNode } from '../api/client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

  const { setCurrentProject } = useProjectStore();

  // Load project on mount if projectId provided
  useEffect(() => {
    if (projectId) {
      setProjectId(projectId);
      loadProject(projectId);
    }
  }, [projectId]);

  /**
   * Load an existing design project from the backend
   */
  const loadProject = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/projects/${id}`);
      if (response.ok) {
        const project = await response.json();
        setCurrentProject(project);

        // If project has saved spec, import it
        if (project.spec && project.spec.nodes && project.spec.nodes.length > 0) {
          // Map project spec nodes to design devices
          const importedDevices = project.spec.nodes.map((node: any) => ({
            id: node.node_id || `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            nodeId: node.node_id,
            name: node.description || node.node_id,
            description: node.description || '',
            boardType: node.board_type || 'esp32',
            position: { x: node.lng || -79.9428, y: node.lat || 40.4432 },
            features: [],
            assertions: [],
          }));

          if (importedDevices.length > 0) {
            importDesign(importedDevices, project.spec.connections || []);
          }
        }
        console.log('Loaded project:', project.name);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  }, [setLoading, importDesign, setCurrentProject]);

  /**
   * Save the current design to the project
   */
  const saveProject = useCallback(async (): Promise<SaveDesignResponse | null> => {
    if (!projectId) return null;

    setLoading(true);
    try {
      // Save spec to project
      const spec = {
        prompt: prompt || settings.general.description,
        nodes: devices.map(d => ({
          node_id: d.nodeId,
          description: d.description || d.name,
          board_type: d.boardType,
          lat: d.position.y,
          lng: d.position.x,
        })),
        connections: connections.map(c => ({
          from: c.from,
          to: c.to,
        })),
      };

      const response = await fetch(`${API_BASE}/api/projects/${projectId}/spec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(spec),
      });

      if (response.ok) {
        markSaved();
        return { id: projectId, savedAt: Date.now() };
      }
      return null;
    } catch (error) {
      console.error('Failed to save project:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [devices, connections, settings, prompt, setLoading, markSaved, projectId]);

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
   * Returns session ID (project ID) if successful, null/false otherwise
   */
  const proceedToBuild = useCallback(async () => {
    // Validate design has at least one device
    if (devices.length === 0) {
      console.error('Cannot proceed: no devices in design');
      return null;
    }

    if (!projectId) {
      console.error('Cannot proceed: no project ID');
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

      // Update project stage
      await fetch(`${API_BASE}/api/projects/${projectId}/stage/build`, {
        method: 'POST',
      });

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

      // Call the REAL API to start build with project ID as session ID
      // Use the first device's board type as the main board type (or settings default)
      const boardId = devices[0].boardType || settings.hardware.defaultBoard;

      const response = await buildApi.start({
        description: settings.general.description || 'Swarm Build',
        board_id: boardId,
        nodes: buildNodes,
        session_id: projectId, // Use project ID as session ID
      });

      console.log('Build started successfully:', response);
      // Return project ID as the session ID for consistent navigation
      return projectId;

    } catch (error) {
      console.error('Failed to start build:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [devices, saveProject, settings.hardware.defaultBoard, settings.general.description, setLoading, projectId]);

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
