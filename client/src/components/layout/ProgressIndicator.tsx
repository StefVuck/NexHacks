import React from 'react';
import { useDesignStore } from '../../stores/designStore';
import type { Stage, StageStatus } from '../../types/design';
import { cn } from '../../lib/utils';
import { Check, Circle, Loader2 } from 'lucide-react';

interface StepProps {
  stage: Stage;
  status: StageStatus;
  isFirst: boolean;
  isLast: boolean;
  index: number;
}

const stageLabels: Record<Stage, string> = {
  design: 'Design',
  build: 'Build',
  simulate: 'Simulate',
  deploy: 'Deploy',
};

const Step: React.FC<StepProps> = ({ stage, status, isFirst, isLast, index }) => {
  const isActive = status.status === 'active';
  const isCompleted = status.status === 'completed';
  const isLocked = status.status === 'locked';
  const isAvailable = status.status === 'available';

  return (
    <div className="flex items-center">
      {/* Connector line before */}
      {!isFirst && (
        <div
          className={cn(
            'w-8 h-[2px] transition-colors duration-300',
            isCompleted || isActive || isAvailable ? 'bg-emerald-500' : 'bg-gray-700'
          )}
        />
      )}

      {/* Step indicator */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
            'border-2',
            isCompleted && 'bg-emerald-500 border-emerald-500',
            isActive && 'bg-blue-500/20 border-blue-500 animate-pulse',
            isAvailable && 'bg-transparent border-gray-500',
            isLocked && 'bg-transparent border-gray-700'
          )}
        >
          {isCompleted ? (
            <Check className="w-4 h-4 text-white" />
          ) : isActive ? (
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          ) : (
            <span
              className={cn(
                'text-xs font-bold',
                isAvailable ? 'text-gray-400' : 'text-gray-600'
              )}
            >
              {index + 1}
            </span>
          )}
        </div>
        <span
          className={cn(
            'mt-1.5 text-[10px] font-medium uppercase tracking-wider',
            isCompleted && 'text-emerald-400',
            isActive && 'text-blue-400',
            isAvailable && 'text-gray-400',
            isLocked && 'text-gray-600'
          )}
        >
          {stageLabels[stage]}
        </span>
      </div>

      {/* Connector line after */}
      {!isLast && (
        <div
          className={cn(
            'w-8 h-[2px] transition-colors duration-300',
            isCompleted ? 'bg-emerald-500' : 'bg-gray-700'
          )}
        />
      )}
    </div>
  );
};

interface ProgressIndicatorProps {
  className?: string;
  variant?: 'horizontal' | 'compact';
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  className,
  variant = 'horizontal',
}) => {
  const stages = useDesignStore((state) => state.stages);

  if (variant === 'compact') {
    const currentStage = stages.find((s) => s.status === 'active');
    const completedCount = stages.filter((s) => s.status === 'completed').length;

    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex items-center gap-1">
          {stages.map((stage, idx) => (
            <div
              key={stage.stage}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                stage.status === 'completed' && 'bg-emerald-500',
                stage.status === 'active' && 'bg-blue-500',
                stage.status === 'available' && 'bg-gray-500',
                stage.status === 'locked' && 'bg-gray-700'
              )}
            />
          ))}
        </div>
        <span className="text-xs text-gray-400">
          {completedCount}/4 • {currentStage ? stageLabels[currentStage.stage] : 'Ready'}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-center', className)}>
      {stages.map((stage, index) => (
        <Step
          key={stage.stage}
          stage={stage.stage}
          status={stage}
          isFirst={index === 0}
          isLast={index === stages.length - 1}
          index={index}
        />
      ))}
    </div>
  );
};

export default ProgressIndicator;
