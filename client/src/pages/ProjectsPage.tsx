import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Folder,
  Trash2,
  Clock,
  ChevronRight,
  Loader2,
  AlertCircle,
  Cpu,
  Cloud,
  Play,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProjects } from '@/hooks/useProjects';
import { Project, ProjectStage } from '@/stores/projectStore';
import { formatDistanceToNow } from 'date-fns';

const stageConfig: Record<ProjectStage, { label: string; icon: React.ReactNode; color: string }> = {
  design: { label: 'Design', icon: <Pencil className="h-3 w-3" />, color: 'text-blue-400' },
  build: { label: 'Build', icon: <Cpu className="h-3 w-3" />, color: 'text-yellow-400' },
  simulate: { label: 'Simulate', icon: <Play className="h-3 w-3" />, color: 'text-purple-400' },
  deploy: { label: 'Deploy', icon: <Cloud className="h-3 w-3" />, color: 'text-emerald-400' },
};

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, isLoading, error, loadProjects, createProject, deleteProject } = useProjects();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    setIsCreating(true);
    try {
      const project = await createProject(newProjectName.trim(), newProjectDescription.trim() || undefined);
      setCreateDialogOpen(false);
      setNewProjectName('');
      setNewProjectDescription('');
      navigate(`/design/${project.id}`);
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      await deleteProject(projectToDelete.id);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const openProject = (project: Project) => {
    navigate(`/${project.current_stage}/${project.id}`);
  };

  const formatDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  const getStageProgress = (project: Project) => {
    const stages: ProjectStage[] = ['design', 'build', 'simulate', 'deploy'];
    const currentIndex = stages.indexOf(project.current_stage);
    return { current: currentIndex + 1, total: stages.length };
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Grid Background */}
      <div
        className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* Vignette */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(10,10,10,0.9)_100%)]" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Folder className="h-6 w-6 text-blue-400" />
              <h1 className="text-xl font-bold">Projects</h1>
            </div>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && projects.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && projects.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <Folder className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-300 mb-2">No projects yet</h2>
            <p className="text-gray-500 mb-6">Create your first project to get started</p>
            <Button onClick={() => setCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-500">
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </motion.div>
        )}

        {/* Projects Grid */}
        {projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {projects.map((project) => {
                const stage = stageConfig[project.current_stage];
                const progress = getStageProgress(project);

                return (
                  <motion.div
                    key={project.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <Card
                      className="bg-black/40 border-white/10 backdrop-blur-sm hover:border-white/20 transition-colors cursor-pointer group"
                      onClick={() => openProject(project)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                              {project.name}
                            </h3>
                            {project.description && (
                              <p className="text-xs text-gray-500 truncate mt-0.5">
                                {project.description}
                              </p>
                            )}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectToDelete(project);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Stage Badge */}
                        <div className="flex items-center gap-2 mb-3">
                          <Badge
                            variant="outline"
                            className={`${stage.color} border-current/30 flex items-center gap-1`}
                          >
                            {stage.icon}
                            {stage.label}
                          </Badge>
                          <span className="text-[10px] text-gray-500">
                            Stage {progress.current}/{progress.total}
                          </span>
                        </div>

                        {/* Progress Dots */}
                        <div className="flex gap-1 mb-3">
                          {(['design', 'build', 'simulate', 'deploy'] as ProjectStage[]).map((s) => {
                            const isComplete = project[`${s}_complete` as keyof Project];
                            const isCurrent = project.current_stage === s;
                            return (
                              <div
                                key={s}
                                className={`h-1.5 flex-1 rounded-full ${
                                  isComplete
                                    ? 'bg-emerald-500'
                                    : isCurrent
                                    ? 'bg-blue-500'
                                    : 'bg-white/10'
                                }`}
                              />
                            );
                          })}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(project.updated_at)}
                          </div>
                          <div className="flex items-center gap-1 text-gray-400 group-hover:text-blue-400 transition-colors">
                            Open <ChevronRight className="h-3 w-3" />
                          </div>
                        </div>

                        {/* Node count if available */}
                        {project.spec?.nodes?.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-gray-500">
                            {project.spec.nodes.length} node{project.spec.nodes.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Create Project Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-[#0a0a0a] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300">
                Project Name
              </Label>
              <Input
                id="name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="My IoT Swarm"
                className="bg-black/50 border-white/10 text-white"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-300">
                Description (optional)
              </Label>
              <Input
                id="description"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="Temperature sensors with cloud aggregation"
                className="bg-black/50 border-white/10 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              className="text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim() || isCreating}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-[#0a0a0a] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Project</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-400">
              Are you sure you want to delete <span className="text-white font-semibold">{projectToDelete?.name}</span>?
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="text-gray-300"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProject}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
