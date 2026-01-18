import React from 'react';
import { useDesignStore } from '../../stores/designStore';
import type { Stage, StageStatus } from '../../types/design';
import { cn } from '../../lib/utils';
import {
  PenTool,
  Wrench,
  Play,
  Rocket,
  Check,
  Lock,
} from 'lucide-react';

interface StageTabProps {
  stage: Stage;
  status: StageStatus;
  isActive: boolean;
  onClick: () => void;
}

const stageConfig: Record<Stage, { label: string; icon: React.ElementType }> = {
  design: { label: 'Design', icon: PenTool },
  build: { label: 'Build', icon: Wrench },
  simulate: { label: 'Simulate', icon: Play },
  deploy: { label: 'Deploy', icon: Rocket },
};

const StageTab: React.FC<StageTabProps> = ({ stage, status, isActive, onClick }) => {
  const config = stageConfig[stage];
  const Icon = config.icon;
  const isLocked = status.status === 'locked';
  const isCompleted = status.status === 'completed';

  return (
    <button
      onClick={onClick}
      disabled={isLocked}
      className={cn(
        'relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200',
        'border-b-2 -mb-[2px]',
        isActive && 'text-white border-blue-500 bg-blue-500/10',
        !isActive && !isLocked && 'text-gray-400 border-transparent hover:text-gray-200 hover:border-gray-600',
        isLocked && 'text-gray-600 border-transparent cursor-not-allowed',
        isCompleted && !isActive && 'text-emerald-400'
      )}
    >
      <span className="relative">
        {isLocked ? (
          <Lock className="w-4 h-4" />
        ) : isCompleted ? (
          <Check className="w-4 h-4" />
        ) : (
          <Icon className="w-4 h-4" />
        )}
      </span>
      <span>{config.label}</span>
      {isActive && (
        <span className="absolute -bottom-[2px] left-0 right-0 h-[2px] bg-blue-500" />
      )}
    </button>
  );
};

interface StageTabsProps {
  className?: string;
}

export const StageTabs: React.FC<StageTabsProps> = ({ className }) => {
  const stages = useDesignStore((state) => state.stages);
  const currentStage = useDesignStore((state) => state.currentStage);
  const setCurrentStage = useDesignStore((state) => state.setCurrentStage);
  const canNavigateToStage = useDesignStore((state) => state.canNavigateToStage);

  const handleStageClick = (stage: Stage) => {
    if (canNavigateToStage(stage)) {
      setCurrentStage(stage);
      // TODO: API call or navigation to stage-specific route
      // navigate(`/${stage}/${projectId}`);
    }
  };

  return (
    <nav className={cn('flex items-center border-b border-white/10', className)}>
      {stages.map((stageStatus) => (
        <StageTab
          key={stageStatus.stage}
          stage={stageStatus.stage}
          status={stageStatus}
          isActive={currentStage === stageStatus.stage}
          onClick={() => handleStageClick(stageStatus.stage)}
        />
      ))}
    </nav>
  );
};

export default StageTabs;
