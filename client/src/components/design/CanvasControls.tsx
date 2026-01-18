import React from 'react';
import { useDesignStore } from '../../stores/designStore';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid3X3,
  Eye,
  EyeOff,
} from 'lucide-react';

interface CanvasControlsProps {
  className?: string;
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({ className }) => {
  const canvasView = useDesignStore((state) => state.canvasView);
  const setZoom = useDesignStore((state) => state.setZoom);
  const toggleGridSnap = useDesignStore((state) => state.toggleGridSnap);
  const toggleShowGrid = useDesignStore((state) => state.toggleShowGrid);
  const fitToView = useDesignStore((state) => state.fitToView);

  const handleZoomIn = () => {
    setZoom(canvasView.zoom * 1.2);
  };

  const handleZoomOut = () => {
    setZoom(canvasView.zoom / 1.2);
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const zoomPercentage = Math.round(canvasView.zoom * 100);

  return (
    <div
      className={cn(
        'flex flex-col gap-1 p-1 rounded-lg bg-[#121212]/90 backdrop-blur border border-white/10',
        className
      )}
    >
      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          className="h-8 w-8 text-gray-400 hover:text-white"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>

        <button
          onClick={handleResetZoom}
          className="px-2 py-1 text-xs font-mono text-gray-400 hover:text-white min-w-[48px] text-center"
          title="Reset zoom"
        >
          {zoomPercentage}%
        </button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomIn}
          className="h-8 w-8 text-gray-400 hover:text-white"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>

      <div className="h-px bg-white/10" />

      {/* View controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={fitToView}
          className="h-8 w-8 text-gray-400 hover:text-white"
          title="Fit to view"
        >
          <Maximize className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleShowGrid}
          className={cn(
            'h-8 w-8',
            canvasView.showGrid ? 'text-blue-400' : 'text-gray-400 hover:text-white'
          )}
          title={canvasView.showGrid ? 'Hide grid' : 'Show grid'}
        >
          {canvasView.showGrid ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleGridSnap}
          className={cn(
            'h-8 w-8',
            canvasView.gridSnap ? 'text-blue-400' : 'text-gray-400 hover:text-white'
          )}
          title={canvasView.gridSnap ? 'Disable grid snap' : 'Enable grid snap'}
        >
          <Grid3X3 className="w-4 h-4" />
        </Button>
      </div>

      {/* Status indicators */}
      <div className="px-2 py-1 text-[10px] text-gray-600 flex items-center gap-2">
        {canvasView.gridSnap && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Snap
          </span>
        )}
        {canvasView.showGrid && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Grid
          </span>
        )}
      </div>
    </div>
  );
};

export default CanvasControls;
