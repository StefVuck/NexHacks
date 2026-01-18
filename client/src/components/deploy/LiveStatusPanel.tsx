import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Wifi,
  WifiOff,
  Thermometer,
  Droplets,
  AlertTriangle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NodeTelemetry } from '@/stores/deployStore';
import { formatDistanceToNow } from 'date-fns';

interface LiveStatusPanelProps {
  telemetry: Record<string, NodeTelemetry>;
  serverOnline: boolean;
  onSimulate?: () => void;
}

export function LiveStatusPanel({
  telemetry,
  serverOnline,
  onSimulate,
}: LiveStatusPanelProps) {
  const nodes = Object.values(telemetry);
  const onlineNodes = nodes.filter((n) => n.online);
  const hasAlerts = nodes.some((n) => n.alerts.length > 0);

  return (
    <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            Live Status
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasAlerts && (
              <Badge variant="destructive" className="text-xs animate-pulse">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Alerts
              </Badge>
            )}
            <Badge
              variant="outline"
              className={serverOnline ? 'text-emerald-400 border-emerald-400/30' : 'text-gray-400'}
            >
              {serverOnline ? (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  Server Online
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </>
              )}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-white/5 rounded-lg">
          <div className="text-center">
            <p className="text-xl font-bold text-white">{nodes.length}</p>
            <p className="text-[10px] text-gray-500 uppercase">Total Nodes</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-emerald-400">{onlineNodes.length}</p>
            <p className="text-[10px] text-gray-500 uppercase">Online</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-400">{nodes.length - onlineNodes.length}</p>
            <p className="text-[10px] text-gray-500 uppercase">Offline</p>
          </div>
        </div>

        {/* Node Cards Grid */}
        <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto pr-1">
          <AnimatePresence mode="popLayout">
            {nodes.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-2 flex flex-col items-center justify-center py-8 text-center"
              >
                <Activity className="h-8 w-8 text-gray-600 mb-3" />
                <p className="text-sm text-gray-400">No telemetry data</p>
                <p className="text-xs text-gray-500 mt-1">
                  Deploy and flash nodes to see live data
                </p>
                {onSimulate && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onSimulate}
                    className="mt-3"
                  >
                    <RefreshCw className="h-3 w-3 mr-1.5" />
                    Simulate Data
                  </Button>
                )}
              </motion.div>
            ) : (
              nodes.map((node) => (
                <NodeStatusCard key={node.node_id} node={node} />
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Simulate Button (for testing) */}
        {nodes.length > 0 && onSimulate && (
          <Button
            size="sm"
            variant="outline"
            onClick={onSimulate}
            className="w-full text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1.5" />
            Simulate New Readings
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function NodeStatusCard({ node }: { node: NodeTelemetry }) {
  const hasAlerts = node.alerts.length > 0;

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return 'Never';
    try {
      return formatDistanceToNow(new Date(lastSeen), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`p-3 rounded-lg border transition-colors ${
        hasAlerts
          ? 'bg-red-500/10 border-red-500/30'
          : node.online
          ? 'bg-white/5 border-white/10'
          : 'bg-gray-500/10 border-gray-500/20'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-white truncate">{node.node_id}</span>
        <span
          className={`flex items-center gap-1 text-[10px] ${
            node.online ? 'text-emerald-400' : 'text-gray-500'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              node.online ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
            }`}
          />
          {node.online ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Last Seen */}
      <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-2">
        <Clock className="h-2.5 w-2.5" />
        {formatLastSeen(node.last_seen)}
      </div>

      {/* Readings */}
      <div className="space-y-1">
        {node.readings.temperature !== undefined && (
          <ReadingRow
            icon={<Thermometer className="h-3 w-3 text-orange-400" />}
            label="Temp"
            value={`${node.readings.temperature.toFixed(1)}°C`}
            alert={node.readings.temperature > 35}
          />
        )}
        {node.readings.humidity !== undefined && (
          <ReadingRow
            icon={<Droplets className="h-3 w-3 text-blue-400" />}
            label="Humidity"
            value={`${node.readings.humidity.toFixed(1)}%`}
            alert={node.readings.humidity > 80}
          />
        )}
        {Object.entries(node.readings)
          .filter(([key]) => !['temperature', 'humidity'].includes(key))
          .map(([key, value]) => (
            <ReadingRow
              key={key}
              icon={<Activity className="h-3 w-3 text-gray-400" />}
              label={key}
              value={typeof value === 'number' ? value.toFixed(2) : String(value)}
            />
          ))}
      </div>

      {/* Alerts */}
      {hasAlerts && (
        <div className="mt-2 pt-2 border-t border-red-500/20">
          {node.alerts.slice(0, 2).map((alert, i) => (
            <div key={i} className="flex items-start gap-1 text-[10px] text-red-400">
              <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-1">{alert}</span>
            </div>
          ))}
          {node.alerts.length > 2 && (
            <p className="text-[10px] text-red-400/70 mt-1">
              +{node.alerts.length - 2} more alerts
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ReadingRow({
  icon,
  label,
  value,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] text-gray-400">{label}</span>
      </div>
      <span className={`text-xs font-mono ${alert ? 'text-red-400' : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}
