import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDesignStore } from '../../stores/designStore';
import { useProjectStore } from '../../stores/projectStore';
import { StageTabs } from './StageTabs';
import { ProgressIndicator } from './ProgressIndicator';
import { cn } from '../../lib/utils';
import {
  Settings,
  HelpCircle,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  FolderOpen,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '../ui/button';
import heliosLogo from '../../assets/helios.png';

interface AppHeaderProps {
  className?: string;
  showStageTabs?: boolean;
  showProgress?: boolean;
  projectName?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  className,
  showStageTabs = true,
  showProgress = true,
  projectName: propProjectName,
}) => {
  const navigate = useNavigate();
  const currentProject = useProjectStore((state) => state.currentProject);
  const designStoreName = useDesignStore((state) => state.settings.general.name);
  const isDirty = useDesignStore((state) => state.isDirty);
  const isLoading = useDesignStore((state) => state.isLoading);
  const lastSaved = useDesignStore((state) => state.lastSaved);
  const openSettingsModal = useDesignStore((state) => state.openSettingsModal);

  // Use prop > current project > design store name
  const projectName = propProjectName || currentProject?.name || designStoreName || 'Untitled Project';

  const handleSave = async () => {
    // TODO: API call to POST /api/design/save
    // const response = await api.saveDesign(projectId, getState());
    // markSaved();
    console.log('Save triggered - TODO: implement API call');
  };

  const formatLastSaved = (timestamp: number | null) => {
    if (!timestamp) return 'Not saved';
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Saved just now';
    if (diff < 3600000) return `Saved ${Math.floor(diff / 60000)}m ago`;
    return `Saved ${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <header
      className={cn(
        'bg-[#121212] border-b border-white/10',
        className
      )}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Logo, back button, and project name */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img src={heliosLogo} alt="Helios" className="w-10 h-8 object-contain" />
          </button>

          <div className="h-6 w-px bg-white/10" />

          {/* Back to projects */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/projects')}
            className="text-gray-400 hover:text-white gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <FolderOpen className="w-4 h-4" />
          </Button>

          <div className="h-6 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate max-w-[200px]">
              {projectName}
            </span>
            {isDirty && (
              <span className="w-2 h-2 rounded-full bg-amber-500" title="Unsaved changes" />
            )}
          </div>

          {/* Save status */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            {isLoading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Saving...</span>
              </>
            ) : isDirty ? (
              <>
                <AlertCircle className="w-3 h-3 text-amber-500" />
                <span className="text-amber-500">Unsaved</span>
              </>
            ) : lastSaved ? (
              <>
                <CheckCircle className="w-3 h-3 text-emerald-500" />
                <span>{formatLastSaved(lastSaved)}</span>
              </>
            ) : null}
          </div>
        </div>

        {/* Center: Progress indicator (compact) */}
        {showProgress && (
          <div className="absolute left-1/2 -translate-x-1/2">
            <ProgressIndicator variant="compact" />
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isLoading}
            className="text-gray-400 hover:text-white"
          >
            <Save className="w-4 h-4 mr-1.5" />
            Save
          </Button>

          <div className="h-6 w-px bg-white/10" />

          <Button
            variant="ghost"
            size="icon"
            onClick={openSettingsModal}
            className="text-gray-400 hover:text-white"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              // TODO: Open help panel or navigate to docs
              window.open('https://docs.swarm-architect.dev', '_blank');
            }}
            className="text-gray-400 hover:text-white"
            title="Help"
          >
            <HelpCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stage tabs */}
      {showStageTabs && (
        <div className="px-4">
          <StageTabs />
        </div>
      )}
    </header>
  );
};

export default AppHeader;
