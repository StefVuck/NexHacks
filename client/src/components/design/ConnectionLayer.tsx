import React, { useMemo } from 'react';
import { useDesignStore } from '../../stores/designStore';
import type { Connection, Device, Position } from '../../types/design';
import { cn } from '../../lib/utils';

interface ConnectionLineProps {
  connection: Connection;
  fromDevice: Device;
  toDevice: Device;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({
  connection,
  fromDevice,
  toDevice,
  isSelected,
  onSelect,
}) => {
  // Calculate line path with a slight curve
  const { path, midPoint, angle } = useMemo(() => {
    const from = fromDevice.position;
    const to = toDevice.position;

    // Offset to center of device node (assuming 80px width)
    const nodeOffset = 40;
    const fromX = from.x + nodeOffset;
    const fromY = from.y + nodeOffset;
    const toX = to.x + nodeOffset;
    const toY = to.y + nodeOffset;

    // Calculate midpoint
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;

    // Calculate angle for arrow
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Create curved path
    const curveOffset = 0; // No curve for straight lines, increase for curves
    const path = `M ${fromX} ${fromY} Q ${midX} ${midY + curveOffset} ${toX} ${toY}`;

    return { path, midPoint: { x: midX, y: midY }, angle };
  }, [fromDevice.position, toDevice.position]);

  const protocolColor = connection.protocol === 'mqtt' ? '#3b82f6' : '#f59e0b';

  return (
    <g
      className="cursor-pointer"
      onClick={() => onSelect(connection.id)}
    >
      {/* Invisible wider path for easier clicking */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
      />

      {/* Visible connection line */}
      <path
        d={path}
        fill="none"
        stroke={isSelected ? '#60a5fa' : protocolColor}
        strokeWidth={isSelected ? 3 : 2}
        strokeDasharray={connection.protocol === 'http' ? '8,4' : undefined}
        className="transition-all duration-150"
        style={{
          filter: isSelected ? 'drop-shadow(0 0 4px rgba(96, 165, 250, 0.5))' : undefined,
        }}
      />

      {/* Arrow at midpoint */}
      <polygon
        points="-6,-4 6,0 -6,4"
        fill={isSelected ? '#60a5fa' : protocolColor}
        transform={`translate(${midPoint.x}, ${midPoint.y}) rotate(${angle})`}
      />

      {/* Protocol label */}
      {connection.label && (
        <text
          x={midPoint.x}
          y={midPoint.y - 10}
          textAnchor="middle"
          className="text-[10px] fill-gray-400 select-none pointer-events-none"
        >
          {connection.label}
        </text>
      )}
    </g>
  );
};

interface ConnectionLayerProps {
  className?: string;
}

export const ConnectionLayer: React.FC<ConnectionLayerProps> = ({ className }) => {
  const devices = useDesignStore((state) => state.devices);
  const connections = useDesignStore((state) => state.connections);
  const selectedConnectionIds = useDesignStore(
    (state) => state.selection.selectedConnectionIds
  );

  // Create device lookup map
  const deviceMap = useMemo(() => {
    const map = new Map<string, Device>();
    devices.forEach((d) => map.set(d.id, d));
    return map;
  }, [devices]);

  // Handle connection selection
  const handleSelectConnection = (id: string) => {
    // For now, just log - implement selection in store if needed
    console.log('Selected connection:', id);
  };

  return (
    <svg
      className={cn(
        'absolute inset-0 w-full h-full pointer-events-none',
        className
      )}
      style={{ zIndex: 1 }}
    >
      <g className="pointer-events-auto">
        {connections.map((connection) => {
          const fromDevice = deviceMap.get(connection.fromDeviceId);
          const toDevice = deviceMap.get(connection.toDeviceId);

          if (!fromDevice || !toDevice) return null;

          return (
            <ConnectionLine
              key={connection.id}
              connection={connection}
              fromDevice={fromDevice}
              toDevice={toDevice}
              isSelected={selectedConnectionIds.includes(connection.id)}
              onSelect={handleSelectConnection}
            />
          );
        })}
      </g>
    </svg>
  );
};

export default ConnectionLayer;
