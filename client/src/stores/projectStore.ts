import { create } from 'zustand';

export type ProjectStage = 'design' | 'build' | 'simulate' | 'deploy';

export interface ProjectSpec {
  prompt?: string;
  nodes: Array<{
    node_id: string;
    description?: string;
    board_type?: string;
    lat?: number;
    lng?: number;
  }>;
  connections: Array<{
    from: string;
    to: string;
  }>;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  current_stage: ProjectStage;
  design_complete: boolean;
  build_complete: boolean;
  simulate_complete: boolean;
  deploy_complete: boolean;
  spec: ProjectSpec;
  cloud_status: string;
  terraform_outputs?: {
    server_ip: string;
    server_url: string;
    mqtt_broker: string;
    mqtt_port: number;
  };
}

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,

  setProjects: (projects) => set({ projects }),

  setCurrentProject: (project) => set({ currentProject: project }),

  addProject: (project) =>
    set((state) => ({ projects: [project, ...state.projects] })),

  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
      currentProject:
        state.currentProject?.id === id
          ? { ...state.currentProject, ...updates }
          : state.currentProject,
    })),

  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject:
        state.currentProject?.id === id ? null : state.currentProject,
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));
