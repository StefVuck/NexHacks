import React from 'react';
import { useDesignStore } from '../../stores/designStore';
import type { CloudProvider } from '../../types/design';
import { cn } from '../../lib/utils';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Cloud, Server } from 'lucide-react';

interface CloudSettingsProps {
  className?: string;
}

const providers: { value: CloudProvider; label: string; icon: string }[] = [
  { value: 'aws', label: 'AWS', icon: '🔶' },
  { value: 'gcp', label: 'Google Cloud', icon: '🔵' },
  { value: 'azure', label: 'Azure', icon: '🔷' },
];

const awsRegions = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'Europe (Ireland)' },
  { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
];

const gcpRegions = [
  { value: 'us-central1', label: 'US Central (Iowa)' },
  { value: 'us-east1', label: 'US East (South Carolina)' },
  { value: 'europe-west1', label: 'Europe (Belgium)' },
  { value: 'asia-east1', label: 'Asia (Taiwan)' },
];

const azureRegions = [
  { value: 'eastus', label: 'East US' },
  { value: 'westus2', label: 'West US 2' },
  { value: 'westeurope', label: 'West Europe' },
  { value: 'southeastasia', label: 'Southeast Asia' },
];

const instanceTypes: Record<CloudProvider, { value: string; label: string }[]> = {
  aws: [
    { value: 't3.micro', label: 't3.micro (1 vCPU, 1GB)' },
    { value: 't3.small', label: 't3.small (2 vCPU, 2GB)' },
    { value: 't3.medium', label: 't3.medium (2 vCPU, 4GB)' },
  ],
  gcp: [
    { value: 'e2-micro', label: 'e2-micro (0.25 vCPU, 1GB)' },
    { value: 'e2-small', label: 'e2-small (0.5 vCPU, 2GB)' },
    { value: 'e2-medium', label: 'e2-medium (1 vCPU, 4GB)' },
  ],
  azure: [
    { value: 'Standard_B1s', label: 'B1s (1 vCPU, 1GB)' },
    { value: 'Standard_B1ms', label: 'B1ms (1 vCPU, 2GB)' },
    { value: 'Standard_B2s', label: 'B2s (2 vCPU, 4GB)' },
  ],
};

export const CloudSettings: React.FC<CloudSettingsProps> = ({ className }) => {
  const settings = useDesignStore((state) => state.settings.cloud);
  const updateCloudSettings = useDesignStore((state) => state.updateCloudSettings);

  const getRegions = () => {
    switch (settings.provider) {
      case 'aws':
        return awsRegions;
      case 'gcp':
        return gcpRegions;
      case 'azure':
        return azureRegions;
      default:
        return awsRegions;
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Cloud Provider */}
      <div className="space-y-2">
        <Label className="text-sm text-gray-300">Cloud Provider</Label>
        <div className="grid grid-cols-3 gap-2">
          {providers.map((provider) => (
            <button
              key={provider.value}
              onClick={() => updateCloudSettings({ provider: provider.value })}
              className={cn(
                'p-3 rounded-lg border text-sm font-medium transition-all',
                'flex flex-col items-center gap-1',
                settings.provider === provider.value
                  ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                  : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
              )}
            >
              <span className="text-lg">{provider.icon}</span>
              <span>{provider.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Region */}
      <div className="space-y-2">
        <Label htmlFor="cloud-region" className="text-sm text-gray-300">
          Region
        </Label>
        <select
          id="cloud-region"
          value={settings.region}
          onChange={(e) => updateCloudSettings({ region: e.target.value })}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {getRegions().map((region) => (
            <option key={region.value} value={region.value} className="bg-gray-900">
              {region.label}
            </option>
          ))}
        </select>
      </div>

      {/* Instance Type */}
      <div className="space-y-2">
        <Label htmlFor="instance-type" className="text-sm text-gray-300">
          Instance Type
        </Label>
        <select
          id="instance-type"
          value={settings.instanceType}
          onChange={(e) => updateCloudSettings({ instanceType: e.target.value })}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {instanceTypes[settings.provider].map((type) => (
            <option key={type.value} value={type.value} className="bg-gray-900">
              {type.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-600">
          For the aggregation server VM
        </p>
      </div>

      {/* Auto-destroy */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="auto-destroy" className="text-sm text-gray-300">
              Auto-destroy
            </Label>
            <p className="text-xs text-gray-600 mt-0.5">
              Automatically destroy resources after timeout
            </p>
          </div>
          <Switch
            id="auto-destroy"
            checked={settings.autoDestroy}
            onCheckedChange={(checked) =>
              updateCloudSettings({ autoDestroy: checked })
            }
          />
        </div>

        {settings.autoDestroy && (
          <div className="space-y-2 pl-4 border-l-2 border-white/10">
            <Label htmlFor="destroy-timeout" className="text-sm text-gray-300">
              Timeout (minutes)
            </Label>
            <Input
              id="destroy-timeout"
              type="number"
              min={5}
              max={1440}
              value={settings.autoDestroyTimeout}
              onChange={(e) =>
                updateCloudSettings({
                  autoDestroyTimeout: parseInt(e.target.value) || 30,
                })
              }
              className="bg-white/5 border-white/10 w-24"
            />
            <p className="text-xs text-gray-600">
              Resources will be destroyed after {settings.autoDestroyTimeout} minutes of inactivity
            </p>
          </div>
        )}
      </div>

      {/* Cost warning */}
      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <div className="flex items-start gap-2">
          <Cloud className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-amber-400 font-medium">Cost Notice</p>
            <p className="text-xs text-amber-400/80 mt-1">
              Cloud resources will incur charges. Enable auto-destroy to minimize costs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloudSettings;
