import React, { useMemo, useState, useEffect } from 'react';
import { useMap } from 'react-map-gl';
import { useDesignStore } from '../../stores/designStore';
import type { Device } from '../../types/design';

interface ConnectionLayerProps {
  className?: string;
}

export const ConnectionLayer: React.FC<ConnectionLayerProps> = () => {
  const { current: map } = useMap();
  const devices = useDesignStore((state) => state.devices);
  const connections = useDesignStore((state) => state.connections);

  // Force re-render on map move via store subscription (covers view state changes)
  useDesignStore((state) => state.canvasView);

  // Also hook into map events directly to ensure smooth animation 
  // (React state update might be slightly throttled vs direct map events)
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!map) return;
    const onMove = () => setTick(t => t + 1);
    map.on('move', onMove);
    map.on('zoom', onMove);
    map.on('rotate', onMove);
    return () => {
      map.off('move', onMove);
      map.off('zoom', onMove);
      map.off('rotate', onMove);
    };
  }, [map]);

  const deviceMap = useMemo(() => {
    const map = new Map<string, Device>();
    devices.forEach((d) => map.set(d.id, d));
    return map;
  }, [devices]);

  if (!map || devices.length < 2) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none w-full h-full"
      style={{ zIndex: 10 }} // Ensure it's above the map tiles but below UI
    >
      {connections.map((conn) => {
        const from = deviceMap.get(conn.fromDeviceId);
        const to = deviceMap.get(conn.toDeviceId);

        // Safety check: Ensure both devices exist and we aren't connecting to self
        if (!from || !to || from.id === to.id) return null;

        const p1 = map.project([from.position.x, from.position.y]);
        const p2 = map.project([to.position.x, to.position.y]);

        return (
          <g key={conn.id}>
            {/* Neon Glow */}
            <line
              x1={p1.x} y1={p1.y}
              x2={p2.x} y2={p2.y}
              stroke="#00f7ff"
              strokeWidth={6}
              strokeOpacity={0.5}
              style={{ filter: 'blur(3px)' }}
            />
            {/* Core Beam */}
            <line
              x1={p1.x} y1={p1.y}
              x2={p2.x} y2={p2.y}
              stroke="#e0ffff"
              strokeWidth={2}
              strokeOpacity={0.9}
            />
          </g>
        );
      })}
    </svg>
  );
};

export default ConnectionLayer;
