import React, { useRef, useCallback, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  pointerWithin,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core';
import Map, { MapRef, ViewStateChangeEvent } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useDesignStore } from '../../stores/designStore';
import { DeviceLayer } from './DeviceLayer';
import { ConnectionLayer } from './ConnectionLayer';
import { DeviceNode } from './DeviceNode';
import type { DevicePaletteItem, Device, BoardType } from '../../types/design';
import { cn } from '../../lib/utils';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYWtzaGF6NyIsImEiOiJjbWlnM2lhbTIwMmVwM2RzODY5M3Vzd2dqIn0.oou6CIFHrUZ1u63Ayr22HQ';
const MAP_STYLE_DARK = 'mapbox://styles/mapbox/dark-v11';

interface DesignCanvasProps {
  className?: string;
}

export const DesignCanvas: React.FC<DesignCanvasProps> = ({ className }) => {
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingItem, setDraggingItem] = useState<DevicePaletteItem | null>(null);

  // Store actions
  const addDevice = useDesignStore((state) => state.addDevice);
  const clearSelection = useDesignStore((state) => state.clearSelection);
  const canvasView = useDesignStore((state) => state.canvasView);
  const setZoom = useDesignStore((state) => state.setZoom);
  const setCenter = useDesignStore((state) => state.setCenter);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;

    if (data?.type === 'palette-item') {
      setDraggingItem(data.item as DevicePaletteItem);
    }
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const data = active.data.current;

    setDraggingItem(null);

    // Only process palette drops
    if (data?.type === 'palette-item' && over?.id === 'device-layer') {
      const item = data.item as DevicePaletteItem;
      const containerRect = containerRef.current?.getBoundingClientRect();

      if (containerRect && event.activatorEvent instanceof PointerEvent) {
        // Calculate drop position relative to canvas
        const x = event.activatorEvent.clientX - containerRect.left + (event.delta?.x || 0);
        const y = event.activatorEvent.clientY - containerRect.top + (event.delta?.y || 0);

        // Snap to grid if enabled
        const { gridSnap, gridSize } = canvasView;
        const snappedX = gridSnap ? Math.round(x / gridSize) * gridSize : x;
        const snappedY = gridSnap ? Math.round(y / gridSize) * gridSize : y;

        // Generate unique node ID
        const existingCount = useDesignStore.getState().devices.filter(
          (d) => d.boardType === item.boardType
        ).length;
        const nodeId = `${item.boardType}_${existingCount + 1}`;

        // Create device from palette item
        const newDevice: Omit<Device, 'id' | 'createdAt' | 'updatedAt'> = {
          nodeId,
          name: `${item.name} ${existingCount + 1}`,
          description: item.description,
          boardType: item.boardType,
          position: { x: snappedX, y: snappedY },
          features: item.defaultFeatures.map((f, idx) => ({
            ...f,
            id: `feature-${idx}`,
          })),
          assertions: [],
        };

        addDevice(newDevice);
      }
    }
  };

  // Handle canvas background click
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      clearSelection();
    }
  };

  // Handle map view changes
  const handleViewChange = useCallback((evt: ViewStateChangeEvent) => {
    setZoom(evt.viewState.zoom);
    setCenter({ x: evt.viewState.longitude, y: evt.viewState.latitude });
  }, [setZoom, setCenter]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={containerRef}
        className={cn('relative w-full h-full overflow-hidden bg-[#0a0a0a]', className)}
        onClick={handleCanvasClick}
      >
        {/* Mapbox background */}
        <div className="absolute inset-0 opacity-60">
          <Map
            ref={mapRef}
            initialViewState={{
              longitude: -79.9428,
              latitude: 40.4432,
              zoom: 16.5,
            }}
            style={{ width: '100%', height: '100%' }}
            mapStyle={MAP_STYLE_DARK}
            mapboxAccessToken={MAPBOX_TOKEN}
            onMove={handleViewChange}
            interactive={true}
          />
        </div>

        {/* Connection layer (SVG lines between devices) */}
        <ConnectionLayer />

        {/* Device layer (nodes) */}
        <DeviceLayer />

        {/* Drag overlay for smooth dragging feedback */}
        <DragOverlay>
          {draggingItem && (
            <div className="opacity-80 pointer-events-none">
              <div className="w-20 h-20 rounded-lg bg-blue-500/20 border-2 border-blue-500 border-dashed flex items-center justify-center">
                <span className="text-xs text-blue-400">{draggingItem.name}</span>
              </div>
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
};

export default DesignCanvas;
