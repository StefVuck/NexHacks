import React, { useRef } from 'react';
import type { Device, BoardType } from '../../types/design';
import { cn } from '../../lib/utils';
import {
  Cpu,
  Wifi,
  Server,
  Microchip,
  CircuitBoard,
  Link,
  Trash2,
  Copy,
} from 'lucide-react';

// Board type to icon mapping
const boardIcons: Record<BoardType, React.ElementType> = {
  esp32: Wifi,
  esp32_s3: Wifi,
  stm32f103: Microchip,
  stm32f4: Microchip,
  arduino_uno: CircuitBoard,
  arduino_nano: CircuitBoard,
  raspberry_pi_pico: Cpu,
  server: Server,
};

// Board type to color mapping
const boardColors: Record<BoardType, { bg: string; border: string; text: string }> = {
  esp32: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400' },
  esp32_s3: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400' },
  stm32f103: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-400' },
  stm32f4: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-400' },
  arduino_uno: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', text: 'text-cyan-400' },
  arduino_nano: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', text: 'text-cyan-400' },
  raspberry_pi_pico: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400' },
  server: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-400' },
};

interface DeviceNodeProps {
  device: Device;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export const DeviceNode: React.FC<DeviceNodeProps> = ({
  device,
  isSelected,
  onClick,
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  const Icon = boardIcons[device.boardType] || Cpu;
  const colors = boardColors[device.boardType] || boardColors.esp32;

  // Count enabled features
  const enabledFeatures = device.features.filter((f) => f.enabled).length;

  return (
    <div
      ref={nodeRef}
      className={cn(
        'w-10 h-10 cursor-pointer select-none relative',
        'transition-transform duration-75',
        'hover:scale-105',
        'active:scale-95'
      )}
      onClick={onClick}
    >
      {/* Selection ring */}
      {isSelected && (
        <div
          className={cn(
            'absolute -inset-1 rounded-xl border-2 border-blue-500',
            'animate-pulse'
          )}
          style={{
            boxShadow: '0 0 12px rgba(59, 130, 246, 0.4)',
          }}
        />
      )}

      {/* Main node */}
      <div
        className={cn(
          'relative w-full h-full rounded-lg border-2 flex flex-col items-center justify-center',
          'backdrop-blur-sm transition-all duration-150',
          colors.bg,
          colors.border,
          isSelected && 'border-blue-500',
          'hover:shadow-lg'
        )}
      >
        {/* Icon */}
        <Icon className={cn('w-6 h-6 mb-1', colors.text)} />

        {/* Name */}
        <span className="text-[10px] font-medium text-white text-center px-1 truncate w-full">
          {device.nodeId}
        </span>

        {/* Feature count badge */}
        {enabledFeatures > 0 && (
          <div
            className={cn(
              'absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center',
              'text-[9px] font-bold bg-white/10 border border-white/20 text-white'
            )}
          >
            {enabledFeatures}
          </div>
        )}

        {/* Connection ports */}
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-600 border border-gray-500" />
        <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-600 border border-gray-500" />
      </div>

      {/* Hover menu */}
      {isSelected && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="p-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
            title="Connect"
          >
            <Link className="w-3 h-3 text-gray-400" />
          </button>
          <button
            className="p-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
            title="Duplicate"
          >
            <Copy className="w-3 h-3 text-gray-400" />
          </button>
          <button
            className="p-1 rounded bg-white/10 hover:bg-red-500/20 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3 h-3 text-gray-400" />
          </button>
        </div>
      )}
    </div>
  );
};

export default DeviceNode;
