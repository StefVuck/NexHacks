import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Usb,
  Cpu,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DeviceInfo, FlashProgress } from '@/stores/deployStore';

interface HardwareDevicesPanelProps {
  devices: DeviceInfo[];
  flashStatus: Record<string, FlashProgress>;
  isScanning: boolean;
  nodes: Array<{ node_id: string; description?: string }>;
  onScan: () => void;
  onAssign: (port: string, nodeId: string) => void;
  onFlash: (port: string, nodeId: string) => void;
  onFlashAll: () => void;
}

const boardTypeColors: Record<string, string> = {
  esp32: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  esp32s3: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  stm32: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  arduino_uno: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  arduino_mega: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  unknown: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
};

const flashStatusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  idle: { color: 'text-gray-400', icon: null },
  preparing: { color: 'text-blue-400', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  erasing: { color: 'text-yellow-400', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  writing: { color: 'text-orange-400', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  verifying: { color: 'text-blue-400', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  complete: { color: 'text-emerald-400', icon: <CheckCircle2 className="h-3 w-3" /> },
  error: { color: 'text-red-400', icon: <XCircle className="h-3 w-3" /> },
};

export function HardwareDevicesPanel({
  devices,
  flashStatus,
  isScanning,
  nodes,
  onScan,
  onAssign,
  onFlash,
  onFlashAll,
}: HardwareDevicesPanelProps) {
  const assignedDevices = devices.filter((d) => d.assigned_node);
  const canFlashAll = assignedDevices.length > 0;

  return (
    <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Usb className="h-5 w-5 text-purple-400" />
            Hardware Devices
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {devices.length} device{devices.length !== 1 ? 's' : ''}
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={onScan}
              disabled={isScanning}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Device List */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          <AnimatePresence mode="popLayout">
            {devices.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-8 text-center"
              >
                <Usb className="h-8 w-8 text-gray-600 mb-3" />
                <p className="text-sm text-gray-400">No devices detected</p>
                <p className="text-xs text-gray-500 mt-1">
                  Connect an ESP32 or STM32 board via USB
                </p>
              </motion.div>
            ) : (
              devices.map((device) => (
                <DeviceCard
                  key={device.port}
                  device={device}
                  flashProgress={flashStatus[device.port]}
                  nodes={nodes}
                  onAssign={(nodeId) => onAssign(device.port, nodeId)}
                  onFlash={() => {
                    if (device.assigned_node) {
                      onFlash(device.port, device.assigned_node);
                    }
                  }}
                />
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Flash All Button */}
        {devices.length > 0 && (
          <Button
            onClick={onFlashAll}
            disabled={!canFlashAll}
            className="w-full bg-purple-600 hover:bg-purple-500"
          >
            <Zap className="h-4 w-4 mr-2" />
            Flash All ({assignedDevices.length} device{assignedDevices.length !== 1 ? 's' : ''})
          </Button>
        )}

        {/* Help Text */}
        {devices.length > 0 && !canFlashAll && (
          <p className="text-xs text-gray-500 text-center">
            Assign nodes to devices to enable flashing
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function DeviceCard({
  device,
  flashProgress,
  nodes,
  onAssign,
  onFlash,
}: {
  device: DeviceInfo;
  flashProgress?: FlashProgress;
  nodes: Array<{ node_id: string; description?: string }>;
  onAssign: (nodeId: string) => void;
  onFlash: () => void;
}) {
  const boardColor = boardTypeColors[device.board_type] || boardTypeColors.unknown;
  const statusConfig = flashProgress ? flashStatusConfig[flashProgress.status] : null;
  const isFlashing = flashProgress && !['idle', 'complete', 'error'].includes(flashProgress.status);
  const isComplete = flashProgress?.status === 'complete';
  const isError = flashProgress?.status === 'error';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-3 bg-white/5 border border-white/10 rounded-lg space-y-2"
    >
      {/* Device Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Cpu className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-mono text-white truncate">{device.port}</p>
            <p className="text-[10px] text-gray-500 truncate">{device.chip_name}</p>
          </div>
        </div>
        <Badge variant="outline" className={`text-[10px] ${boardColor} flex-shrink-0`}>
          {device.board_type.toUpperCase()}
        </Badge>
      </div>

      {/* Node Assignment */}
      <div className="flex items-center gap-2">
        <select
          value={device.assigned_node || ''}
          onChange={(e) => onAssign(e.target.value)}
          disabled={isFlashing}
          className="flex-1 h-8 px-2 text-xs bg-black/50 border border-white/10 rounded text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
        >
          <option value="">Select node...</option>
          {nodes.map((node) => (
            <option key={node.node_id} value={node.node_id}>
              {node.node_id}
              {node.description ? ` - ${node.description}` : ''}
            </option>
          ))}
        </select>

        <Button
          size="sm"
          variant={isComplete ? 'outline' : 'default'}
          className={`h-8 ${isComplete ? 'text-emerald-400 border-emerald-400/30' : ''}`}
          disabled={!device.assigned_node || isFlashing}
          onClick={onFlash}
        >
          {statusConfig?.icon || <Zap className="h-3 w-3 mr-1" />}
          {isFlashing ? flashProgress?.stage : isComplete ? 'Done' : 'Flash'}
        </Button>
      </div>

      {/* Flash Progress */}
      {isFlashing && flashProgress && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className={statusConfig?.color}>{flashProgress.stage}</span>
            <span className="text-gray-400 font-mono">{flashProgress.percent}%</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${flashProgress.percent}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        </div>
      )}

      {/* Error State */}
      {isError && flashProgress?.error && (
        <div className="flex items-start gap-1.5 text-[10px] text-red-400">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-2">{flashProgress.error}</span>
        </div>
      )}
    </motion.div>
  );
}
