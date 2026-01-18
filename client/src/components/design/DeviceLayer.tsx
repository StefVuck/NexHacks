import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useDesignStore } from '../../stores/designStore';
import { DeviceNode } from './DeviceNode';
import { cn } from '../../lib/utils';

interface DeviceLayerProps {
  className?: string;
}

export const DeviceLayer: React.FC<DeviceLayerProps> = ({ className }) => {
  const devices = useDesignStore((state) => state.devices);
  const selectedDeviceIds = useDesignStore((state) => state.selection.selectedDeviceIds);
  const selectDevice = useDesignStore((state) => state.selectDevice);
  const moveDevice = useDesignStore((state) => state.moveDevice);
  const canvasView = useDesignStore((state) => state.canvasView);

  // Make the layer a drop target
  const { setNodeRef, isOver } = useDroppable({
    id: 'device-layer',
  });

  const handleDeviceClick = (deviceId: string, event: React.MouseEvent) => {
    const isMultiSelect = event.shiftKey || event.metaKey || event.ctrlKey;
    selectDevice(deviceId, isMultiSelect);
  };

  const handleDeviceDrag = (deviceId: string, delta: { x: number; y: number }) => {
    const device = devices.find((d) => d.id === deviceId);
    if (device) {
      moveDevice(deviceId, {
        x: device.position.x + delta.x,
        y: device.position.y + delta.y,
      });
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'absolute inset-0',
        isOver && 'bg-blue-500/5',
        className
      )}
      style={{ zIndex: 2 }}
    >
      {/* Grid overlay */}
      {canvasView.showGrid && (
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: `${canvasView.gridSize}px ${canvasView.gridSize}px`,
          }}
        />
      )}

      {/* Render device nodes */}
      {devices.map((device) => (
        <DeviceNode
          key={device.id}
          device={device}
          isSelected={selectedDeviceIds.includes(device.id)}
          onClick={(e) => handleDeviceClick(device.id, e)}
          onDrag={(delta) => handleDeviceDrag(device.id, delta)}
        />
      ))}
    </div>
  );
};

export default DeviceLayer;
