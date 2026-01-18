/**
 * Speed Control Component - Simulation speed selector
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { Gauge } from 'lucide-react';

interface SpeedControlProps {
  speed: number;
  onSpeedChange: (speed: number) => void;
  disabled?: boolean;
}

const SPEEDS = [1, 2, 5];

export function SpeedControl({ speed, onSpeedChange, disabled }: SpeedControlProps) {
  return (
    <div className="flex items-center gap-2">
      <Gauge className="h-4 w-4 text-gray-400" />
      <div className="flex bg-gray-800 rounded-lg p-0.5">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            disabled={disabled}
            className={cn(
              'px-3 py-1 text-sm rounded-md transition-colors',
              speed === s
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
