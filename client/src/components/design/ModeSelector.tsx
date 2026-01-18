import React from 'react';
import { useDesignStore } from '../../stores/designStore';
import type { DesignMode } from '../../types/design';
import { cn } from '../../lib/utils';
import { Sparkles, MousePointer2 } from 'lucide-react';

interface ModeSelectorProps {
  className?: string;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ className }) => {
  const mode = useDesignStore((state) => state.mode);
  const setMode = useDesignStore((state) => state.setMode);
  const devices = useDesignStore((state) => state.devices);

  const handleModeChange = (newMode: DesignMode) => {
    // Warn if switching modes with existing devices
    if (devices.length > 0 && mode !== newMode) {
      // In a real app, you might want to show a confirmation dialog
      console.log('Mode changed - existing devices preserved');
    }
    setMode(newMode);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        Design Mode
      </label>

      <div className="grid grid-cols-2 gap-2">
        {/* AI Mode */}
        <button
          onClick={() => handleModeChange('ai')}
          className={cn(
            'flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all duration-150',
            mode === 'ai'
              ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
              : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-400'
          )}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-xs font-medium">AI Prompt</span>
        </button>

        {/* Manual Mode */}
        <button
          onClick={() => handleModeChange('manual')}
          className={cn(
            'flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all duration-150',
            mode === 'manual'
              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
              : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-400'
          )}
        >
          <MousePointer2 className="w-5 h-5" />
          <span className="text-xs font-medium">Manual</span>
        </button>
      </div>

      {/* Mode description */}
      <p className="text-[10px] text-gray-600">
        {mode === 'ai'
          ? 'Describe your system in natural language and let AI generate the layout.'
          : 'Manually drag and drop devices to build your swarm topology.'}
      </p>
    </div>
  );
};

export default ModeSelector;
