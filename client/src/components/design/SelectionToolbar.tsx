import React from 'react';
import { useDesignStore } from '../../stores/designStore';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import {
  Copy,
  Trash2,
  Link,
  Unlink,
  AlignCenterHorizontal,
  AlignCenterVertical,
  BoxSelect,
} from 'lucide-react';

interface SelectionToolbarProps {
  className?: string;
}

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({ className }) => {
  const selectedDeviceIds = useDesignStore((state) => state.selection.selectedDeviceIds);
  const devices = useDesignStore((state) => state.devices);
  const copySelection = useDesignStore((state) => state.copySelection);
  const pasteClipboard = useDesignStore((state) => state.pasteClipboard);
  const deleteSelection = useDesignStore((state) => state.deleteSelection);
  const duplicateDevices = useDesignStore((state) => state.duplicateDevices);
  const addConnection = useDesignStore((state) => state.addConnection);
  const updateDevice = useDesignStore((state) => state.updateDevice);
  const settings = useDesignStore((state) => state.settings.network);

  const selectionCount = selectedDeviceIds.length;
  const selectedDevices = devices.filter((d) => selectedDeviceIds.includes(d.id));

  // Connect selected devices (if exactly 2)
  const handleConnect = () => {
    if (selectionCount !== 2) return;
    const [from, to] = selectedDeviceIds;
    addConnection({
      fromDeviceId: from,
      toDeviceId: to,
      protocol: settings.protocol,
    });
  };

  // Duplicate selected devices
  const handleDuplicate = () => {
    duplicateDevices(selectedDeviceIds);
  };

  // Align horizontally (same Y)
  const handleAlignHorizontal = () => {
    if (selectionCount < 2) return;
    const avgY =
      selectedDevices.reduce((sum, d) => sum + d.position.y, 0) / selectionCount;
    selectedDeviceIds.forEach((id) => {
      const device = devices.find((d) => d.id === id);
      if (device) {
        updateDevice(id, { position: { ...device.position, y: avgY } });
      }
    });
  };

  // Align vertically (same X)
  const handleAlignVertical = () => {
    if (selectionCount < 2) return;
    const avgX =
      selectedDevices.reduce((sum, d) => sum + d.position.x, 0) / selectionCount;
    selectedDeviceIds.forEach((id) => {
      const device = devices.find((d) => d.id === id);
      if (device) {
        updateDevice(id, { position: { ...device.position, x: avgX } });
      }
    });
  };

  // Copy to clipboard
  const handleCopy = () => {
    copySelection();
  };

  // Delete selection
  const handleDelete = () => {
    deleteSelection();
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-2 py-1.5 rounded-lg',
        'bg-[#121212]/95 backdrop-blur border border-white/10 shadow-lg',
        className
      )}
    >
      {/* Selection count */}
      <div className="flex items-center gap-1.5 px-2 text-xs text-gray-400">
        <BoxSelect className="w-3.5 h-3.5" />
        <span>{selectionCount} selected</span>
      </div>

      <div className="w-px h-6 bg-white/10" />

      {/* Connect (only when 2 devices selected) */}
      {selectionCount === 2 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleConnect}
            className="h-7 px-2 text-gray-400 hover:text-blue-400"
            title="Connect devices"
          >
            <Link className="w-4 h-4 mr-1" />
            <span className="text-xs">Connect</span>
          </Button>

          <div className="w-px h-6 bg-white/10" />
        </>
      )}

      {/* Alignment (only when multiple selected) */}
      {selectionCount > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleAlignHorizontal}
            className="h-7 w-7 text-gray-400 hover:text-white"
            title="Align horizontally"
          >
            <AlignCenterHorizontal className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleAlignVertical}
            className="h-7 w-7 text-gray-400 hover:text-white"
            title="Align vertically"
          >
            <AlignCenterVertical className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-white/10" />
        </>
      )}

      {/* Duplicate */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDuplicate}
        className="h-7 w-7 text-gray-400 hover:text-white"
        title="Duplicate (Cmd+D)"
      >
        <Copy className="w-4 h-4" />
      </Button>

      {/* Copy */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="h-7 w-7 text-gray-400 hover:text-white"
        title="Copy (Cmd+C)"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      </Button>

      <div className="w-px h-6 bg-white/10" />

      {/* Delete */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        className="h-7 w-7 text-gray-400 hover:text-red-400"
        title="Delete (Backspace)"
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      {/* Keyboard hint */}
      <div className="text-[10px] text-gray-600 px-2">
        <span className="hidden sm:inline">⌫ delete • ⌘C copy • ⌘V paste</span>
      </div>
    </div>
  );
};

export default SelectionToolbar;
