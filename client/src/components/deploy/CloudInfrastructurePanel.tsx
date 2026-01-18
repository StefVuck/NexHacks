import React from 'react';
import { motion } from 'framer-motion';
import {
  Cloud,
  Server,
  ExternalLink,
  Terminal,
  Copy,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CloudStatus, TerraformOutputs } from '@/stores/deployStore';

interface CloudInfrastructurePanelProps {
  cloudStatus: CloudStatus;
  canDeploy: boolean;
  canDestroy: boolean;
  isDeploying: boolean;
  isDestroying: boolean;
  prerequisitesReady: boolean;
  onDeploy: () => void;
  onDestroy: () => void;
  onOpenSettings: () => void;
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  idle: { color: 'bg-gray-500', icon: <Cloud className="h-3 w-3" />, label: 'Not Deployed' },
  initializing: { color: 'bg-blue-500', icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'Initializing' },
  planning: { color: 'bg-blue-500', icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'Planning' },
  applying: { color: 'bg-yellow-500', icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'Deploying' },
  deployed: { color: 'bg-emerald-500', icon: <CheckCircle2 className="h-3 w-3" />, label: 'Deployed' },
  destroying: { color: 'bg-orange-500', icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'Destroying' },
  destroyed: { color: 'bg-gray-500', icon: <XCircle className="h-3 w-3" />, label: 'Destroyed' },
  error: { color: 'bg-red-500', icon: <XCircle className="h-3 w-3" />, label: 'Error' },
};

export function CloudInfrastructurePanel({
  cloudStatus,
  canDeploy,
  canDestroy,
  isDeploying,
  isDestroying,
  prerequisitesReady,
  onDeploy,
  onDestroy,
  onOpenSettings,
}: CloudInfrastructurePanelProps) {
  const config = statusConfig[cloudStatus.status] || statusConfig.idle;
  const outputs = cloudStatus.outputs;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Cloud className="h-5 w-5 text-blue-400" />
            Cloud Infrastructure
          </CardTitle>
          <Badge
            variant="outline"
            className={`${config.color} bg-opacity-20 border-current text-white flex items-center gap-1.5`}
          >
            {config.icon}
            {config.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Deploy Button or Status */}
        {cloudStatus.status === 'idle' && (
          <div className="space-y-3">
            <Button
              onClick={onDeploy}
              disabled={!canDeploy}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white"
            >
              <Cloud className="h-4 w-4 mr-2" />
              Deploy to AWS
            </Button>

            {!prerequisitesReady && (
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-yellow-400">
                  <p className="font-medium">Prerequisites not met</p>
                  <p className="text-yellow-400/70 mt-1">
                    Terraform or AWS credentials not configured. Check system requirements.
                  </p>
                </div>
              </div>
            )}

            {prerequisitesReady && !canDeploy && (
              <button
                onClick={onOpenSettings}
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Configure network settings to enable deployment
              </button>
            )}
          </div>
        )}

        {/* Progress Display */}
        {(isDeploying || isDestroying) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{cloudStatus.step || 'Processing...'}</span>
              <span className="text-white font-mono">{cloudStatus.progress_percent}%</span>
            </div>

            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${isDestroying ? 'bg-orange-500' : 'bg-blue-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${cloudStatus.progress_percent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {cloudStatus.message && (
              <p className="text-xs text-gray-500 font-mono truncate">{cloudStatus.message}</p>
            )}
          </div>
        )}

        {/* Error State */}
        {cloudStatus.status === 'error' && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-red-400">
                <p className="font-medium">Deployment failed</p>
                <p className="text-red-400/70 mt-1">{cloudStatus.message || 'Unknown error'}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={onDeploy} size="sm" variant="outline" className="flex-1">
                Retry
              </Button>
              {canDestroy && (
                <Button onClick={onDestroy} size="sm" variant="destructive" className="flex-1">
                  Clean Up
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Deployed Outputs */}
        {cloudStatus.status === 'deployed' && outputs && (
          <div className="space-y-4">
            <OutputRow
              label="Server IP"
              value={outputs.server_ip}
              icon={<Server className="h-3 w-3" />}
              onCopy={() => copyToClipboard(outputs.server_ip)}
            />

            <OutputRow
              label="MQTT Broker"
              value={`${outputs.mqtt_broker}:${outputs.mqtt_port}`}
              icon={<Server className="h-3 w-3" />}
              onCopy={() => copyToClipboard(`${outputs.mqtt_broker}:${outputs.mqtt_port}`)}
            />

            <OutputRow
              label="HTTP API"
              value={outputs.server_url}
              icon={<ExternalLink className="h-3 w-3" />}
              onCopy={() => copyToClipboard(outputs.server_url)}
              isLink
            />

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(outputs.server_url, '_blank')}
                className="text-xs"
              >
                <ExternalLink className="h-3 w-3 mr-1.5" />
                Open Dashboard
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(outputs.ssh_command)}
                className="text-xs"
              >
                <Terminal className="h-3 w-3 mr-1.5" />
                Copy SSH
              </Button>
            </div>

            {/* Destroy Button */}
            <Button
              onClick={onDestroy}
              variant="outline"
              size="sm"
              className="w-full text-red-400 border-red-400/30 hover:bg-red-500/10"
            >
              <Trash2 className="h-3 w-3 mr-1.5" />
              Destroy Infrastructure
            </Button>
          </div>
        )}

        {/* Destroyed State */}
        {cloudStatus.status === 'destroyed' && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400 mb-3">Infrastructure has been destroyed</p>
            <Button onClick={onDeploy} disabled={!canDeploy} size="sm">
              <Cloud className="h-4 w-4 mr-2" />
              Deploy Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OutputRow({
  label,
  value,
  icon,
  onCopy,
  isLink,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  onCopy: () => void;
  isLink?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 p-2 bg-white/5 rounded-md">
      <div className="flex items-center gap-2 min-w-0">
        <div className="text-gray-500">{icon}</div>
        <div className="min-w-0">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
          {isLink ? (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 truncate block"
            >
              {value}
            </a>
          ) : (
            <p className="text-xs text-white font-mono truncate">{value}</p>
          )}
        </div>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 flex-shrink-0"
        onClick={onCopy}
      >
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}
