import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { DevicePaletteItem as DevicePaletteItemType, BoardType } from '../../types/design';
import { cn } from '../../lib/utils';
import {
  Cpu,
  Wifi,
  Radio,
  Server,
  Microchip,
  CircuitBoard,
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
const boardColors: Record<BoardType, string> = {
  esp32: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  esp32_s3: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  stm32f103: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  stm32f4: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  arduino_uno: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  arduino_nano: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  raspberry_pi_pico: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  server: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
};

interface DevicePaletteItemProps {
  item: DevicePaletteItemType;
  className?: string;
}

export const DevicePaletteItem: React.FC<DevicePaletteItemProps> = ({
  item,
  className,
}) => {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: `palette-${item.boardType}`,
    data: {
      type: 'palette-item',
      item,
    },
  });

  const Icon = boardIcons[item.boardType] || Cpu;
  const colorClasses = boardColors[item.boardType] || 'text-gray-400 bg-gray-500/10 border-gray-500/30';

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'relative p-3 rounded-lg border cursor-grab active:cursor-grabbing',
        'transition-all duration-150',
        'hover:scale-[1.02] hover:shadow-lg',
        colorClasses,
        isDragging && 'opacity-50 scale-105 shadow-xl',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
            'bg-white/5'
          )}
        >
          <Icon className="w-5 h-5" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white truncate">
            {item.name}
          </h4>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {item.description}
          </p>

          {/* Specs badges */}
          <div className="flex flex-wrap gap-1 mt-2">
            {item.specs.connectivity?.map((conn) => (
              <span
                key={conn}
                className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-white/5 text-gray-400"
              >
                {conn}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Drag hint */}
      <div className="absolute top-1 right-1 opacity-30">
        <svg
          className="w-3 h-3"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
        </svg>
      </div>
    </div>
  );
};

export default DevicePaletteItem;
