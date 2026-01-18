import React from 'react';
import { Marker } from 'react-map-gl';
import { useDesignStore } from '../../stores/designStore';
import { DeviceNode } from './DeviceNode';

interface DeviceLayerProps {
  className?: string;
}

export const DeviceLayer: React.FC<DeviceLayerProps> = ({ className }) => {
  const devices = useDesignStore((state) => state.devices);
  const selectedDeviceIds = useDesignStore((state) => state.selection.selectedDeviceIds);
  const selectDevice = useDesignStore((state) => state.selectDevice);
  const moveDevice = useDesignStore((state) => state.moveDevice);

  const handleDeviceClick = (deviceId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const isMultiSelect = event.shiftKey || event.metaKey || event.ctrlKey;
    selectDevice(deviceId, isMultiSelect);
  };

  const handleMarkerDrag = (deviceId: string, event: any) => {
    // Event has lngLat: { lng, lat }
    moveDevice(deviceId, {
      x: event.lngLat.lng,
      y: event.lngLat.lat,
    });
  };

  return (
    <>
      {devices.map((device) => {
        // Assume X=Lng, Y=Lat.
        let lng = device.position.x;
        let lat = device.position.y;

        // Validation: Check if coordinates are valid lat/lon
        // If they are likely pixel values (e.g., lat > 90), reset to default
        const isValid = lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

        if (!isValid) {
          console.warn(`Invalid coordinates for device ${device.id}:`, { lng, lat });
          // Fallback to CMU coordinates
          lng = -79.9428;
          lat = 40.4432;
        }

        return (
          <Marker
            key={device.id}
            longitude={lng}
            latitude={lat}
            anchor="center"
            draggable
            onDrag={(e) => handleMarkerDrag(device.id, e)}
            className="pointer-events-auto" // Ensure marker is clickable
          >
            <DeviceNode
              device={device}
              isSelected={selectedDeviceIds.includes(device.id)}
              onClick={(e) => handleDeviceClick(device.id, e)}
            />
          </Marker>
        );
      })}
    </>
  );
};

export default DeviceLayer;
