import { useCallback } from 'react';
import { useProjectStore, Project, ProjectStage } from '../stores/projectStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function useProjects() {
  const store = useProjectStore();

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

  const loadProjects = useCallback(async () => {
    store.setLoading(true);
    store.setError(null);
    try {
      const projects = await fetchApi<Project[]>('/api/projects');
      store.setProjects(projects);
    } catch (error) {
      store.setError(error instanceof Error ? error.message : 'Failed to load projects');
    } finally {
      store.setLoading(false);
    }
  }, [fetchApi]);

  const createProject = useCallback(async (name: string, description?: string) => {
    store.setLoading(true);
    store.setError(null);
    try {
      const project = await fetchApi<Project>('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      });
      store.addProject(project);
      return project;
    } catch (error) {
      store.setError(error instanceof Error ? error.message : 'Failed to create project');
      throw error;
    } finally {
      store.setLoading(false);
    }
  }, [fetchApi]);

  const loadProject = useCallback(async (projectId: string) => {
    store.setLoading(true);
    store.setError(null);
    try {
      const project = await fetchApi<Project>(`/api/projects/${projectId}`);
      store.setCurrentProject(project);
      return project;
    } catch (error) {
      store.setError(error instanceof Error ? error.message : 'Failed to load project');
      throw error;
    } finally {
      store.setLoading(false);
    }
  }, [fetchApi]);

  const deleteProject = useCallback(async (projectId: string) => {
    store.setLoading(true);
    store.setError(null);
    try {
      await fetchApi(`/api/projects/${projectId}`, { method: 'DELETE' });
      store.removeProject(projectId);
    } catch (error) {
      store.setError(error instanceof Error ? error.message : 'Failed to delete project');
      throw error;
    } finally {
      store.setLoading(false);
    }
  }, [fetchApi]);

  const updateProjectStage = useCallback(async (projectId: string, stage: ProjectStage) => {
    try {
      const project = await fetchApi<Project>(`/api/projects/${projectId}/stage/${stage}`, {
        method: 'POST',
      });
      store.updateProject(projectId, project);
      return project;
    } catch (error) {
      console.error('Failed to update project stage:', error);
      throw error;
    }
  }, [fetchApi]);

  const markStageComplete = useCallback(async (projectId: string, stage: ProjectStage) => {
    try {
      const project = await fetchApi<Project>(`/api/projects/${projectId}/stage/${stage}/complete`, {
        method: 'POST',
      });
      store.updateProject(projectId, project);
      return project;
    } catch (error) {
      console.error('Failed to mark stage complete:', error);
      throw error;
    }
  }, [fetchApi]);

  const saveProjectSpec = useCallback(async (
    projectId: string,
    spec: { prompt?: string; nodes: unknown[]; connections: unknown[] }
  ) => {
    try {
      const project = await fetchApi<Project>(`/api/projects/${projectId}/spec`, {
        method: 'POST',
        body: JSON.stringify(spec),
      });
      store.updateProject(projectId, project);
      return project;
    } catch (error) {
      console.error('Failed to save project spec:', error);
      throw error;
    }
  }, [fetchApi]);

  const getProjectSession = useCallback(async (projectId: string) => {
    try {
      return await fetchApi<{
        session_id: string;
        project_id: string;
        project_name: string;
        current_stage: ProjectStage;
      }>(`/api/projects/${projectId}/session`);
    } catch (error) {
      console.error('Failed to get project session:', error);
      throw error;
    }
  }, [fetchApi]);

  return {
    ...store,
    loadProjects,
    createProject,
    loadProject,
    deleteProject,
    updateProjectStage,
    markStageComplete,
    saveProjectSpec,
    getProjectSession,
  };
}
