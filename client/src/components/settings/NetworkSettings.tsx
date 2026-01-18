import React from 'react';
import { useDesignStore } from '../../stores/designStore';
import type { Protocol, QoSLevel } from '../../types/design';
import { cn } from '../../lib/utils';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';

interface NetworkSettingsProps {
  className?: string;
}

export const NetworkSettings: React.FC<NetworkSettingsProps> = ({ className }) => {
  const settings = useDesignStore((state) => state.settings.network);
  const updateNetworkSettings = useDesignStore((state) => state.updateNetworkSettings);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Protocol Selection */}
      <div className="space-y-2">
        <Label className="text-sm text-gray-300">Communication Protocol</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => updateNetworkSettings({ protocol: 'mqtt' })}
            className={cn(
              'p-3 rounded-lg border text-sm font-medium transition-all',
              settings.protocol === 'mqtt'
                ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
            )}
          >
            MQTT
          </button>
          <button
            onClick={() => updateNetworkSettings({ protocol: 'http' })}
            className={cn(
              'p-3 rounded-lg border text-sm font-medium transition-all',
              settings.protocol === 'http'
                ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
            )}
          >
            HTTP
          </button>
        </div>
        <p className="text-xs text-gray-600">
          {settings.protocol === 'mqtt'
            ? 'MQTT is recommended for real-time IoT communication with low overhead'
            : 'HTTP is simpler but has higher overhead for frequent updates'}
        </p>
      </div>

      {/* Broker URL */}
      <div className="space-y-2">
        <Label htmlFor="broker-url" className="text-sm text-gray-300">
          {settings.protocol === 'mqtt' ? 'Broker URL' : 'Server URL'}
        </Label>
        <Input
          id="broker-url"
          value={settings.brokerUrl}
          onChange={(e) => updateNetworkSettings({ brokerUrl: e.target.value })}
          className="bg-white/5 border-white/10"
          placeholder={settings.protocol === 'mqtt' ? 'broker.example.com' : 'api.example.com'}
        />
      </div>

      {/* Port */}
      <div className="space-y-2">
        <Label htmlFor="broker-port" className="text-sm text-gray-300">
          Port
        </Label>
        <Input
          id="broker-port"
          type="number"
          value={settings.brokerPort}
          onChange={(e) =>
            updateNetworkSettings({ brokerPort: parseInt(e.target.value) || 1883 })
          }
          className="bg-white/5 border-white/10 w-24"
        />
        <p className="text-xs text-gray-600">
          Default: {settings.protocol === 'mqtt' ? '1883 (8883 for TLS)' : '80 (443 for HTTPS)'}
        </p>
      </div>

      {/* MQTT-specific settings */}
      {settings.protocol === 'mqtt' && (
        <>
          {/* QoS Level */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-300">QoS Level</Label>
            <div className="grid grid-cols-3 gap-2">
              {([0, 1, 2] as QoSLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => updateNetworkSettings({ qos: level })}
                  className={cn(
                    'p-2 rounded-lg border text-sm font-medium transition-all',
                    settings.qos === level
                      ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                      : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
                  )}
                >
                  QoS {level}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600">
              {settings.qos === 0 && 'At most once - Fire and forget'}
              {settings.qos === 1 && 'At least once - Acknowledged delivery'}
              {settings.qos === 2 && 'Exactly once - Assured delivery'}
            </p>
          </div>

          {/* Topic Prefix */}
          <div className="space-y-2">
            <Label htmlFor="topic-prefix" className="text-sm text-gray-300">
              Topic Prefix
            </Label>
            <Input
              id="topic-prefix"
              value={settings.topicPrefix}
              onChange={(e) => updateNetworkSettings({ topicPrefix: e.target.value })}
              className="bg-white/5 border-white/10"
              placeholder="swarm"
            />
            <p className="text-xs text-gray-600">
              Topics: {settings.topicPrefix}/{'<swarm_id>'}/nodes/{'<node_id>'}/telemetry
            </p>
          </div>
        </>
      )}

      {/* TLS */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="use-tls" className="text-sm text-gray-300">
            Use TLS/SSL
          </Label>
          <p className="text-xs text-gray-600 mt-0.5">
            Encrypt communication (recommended for production)
          </p>
        </div>
        <Switch
          id="use-tls"
          checked={settings.useTls}
          onCheckedChange={(checked) => updateNetworkSettings({ useTls: checked })}
        />
      </div>

      {/* Authentication (optional) */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Authentication (Optional)
        </h4>

        <div className="space-y-2">
          <Label htmlFor="auth-username" className="text-sm text-gray-300">
            Username
          </Label>
          <Input
            id="auth-username"
            value={settings.username || ''}
            onChange={(e) => updateNetworkSettings({ username: e.target.value || undefined })}
            className="bg-white/5 border-white/10"
            placeholder="Optional"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="auth-password" className="text-sm text-gray-300">
            Password
          </Label>
          <Input
            id="auth-password"
            type="password"
            value={settings.password || ''}
            onChange={(e) => updateNetworkSettings({ password: e.target.value || undefined })}
            className="bg-white/5 border-white/10"
            placeholder="Optional"
          />
        </div>
      </div>
    </div>
  );
};

export default NetworkSettings;
