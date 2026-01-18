import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Wifi, Cloud, Cpu, Save } from 'lucide-react';
import { DeploySettings } from '@/stores/deployStore';

interface DeploySettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: DeploySettings;
  onSettingsChange: (settings: Partial<DeploySettings>) => void;
  onSave: () => void;
}

const AWS_REGIONS = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-east-2', label: 'US East (Ohio)' },
  { value: 'us-west-1', label: 'US West (N. California)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'EU (Ireland)' },
  { value: 'eu-west-2', label: 'EU (London)' },
  { value: 'eu-central-1', label: 'EU (Frankfurt)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
];

const INSTANCE_TYPES = [
  { value: 't3.micro', label: 't3.micro (1 vCPU, 1 GB)', tier: 'Free tier eligible' },
  { value: 't3.small', label: 't3.small (2 vCPU, 2 GB)', tier: '' },
  { value: 't3.medium', label: 't3.medium (2 vCPU, 4 GB)', tier: '' },
  { value: 't3.large', label: 't3.large (2 vCPU, 8 GB)', tier: '' },
];

export function DeploySettingsModal({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  onSave,
}: DeploySettingsModalProps) {
  const handleSave = () => {
    onSave();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#0a0a0a] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white">
            Deploy Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="network" className="mt-4">
          <TabsList className="grid w-full grid-cols-3 bg-white/5">
            <TabsTrigger
              value="network"
              className="data-[state=active]:bg-white/10 text-xs"
            >
              <Wifi className="h-3 w-3 mr-1.5" />
              Network
            </TabsTrigger>
            <TabsTrigger
              value="cloud"
              className="data-[state=active]:bg-white/10 text-xs"
            >
              <Cloud className="h-3 w-3 mr-1.5" />
              Cloud
            </TabsTrigger>
            <TabsTrigger
              value="hardware"
              className="data-[state=active]:bg-white/10 text-xs"
            >
              <Cpu className="h-3 w-3 mr-1.5" />
              Hardware
            </TabsTrigger>
          </TabsList>

          {/* Network Tab */}
          <TabsContent value="network" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wifi_ssid" className="text-sm text-gray-300">
                  WiFi SSID <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="wifi_ssid"
                  value={settings.wifi_ssid}
                  onChange={(e) => onSettingsChange({ wifi_ssid: e.target.value })}
                  placeholder="Enter WiFi network name"
                  className="bg-black/50 border-white/10 text-white"
                />
                <p className="text-[10px] text-gray-500">
                  The WiFi network your devices will connect to
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wifi_password" className="text-sm text-gray-300">
                  WiFi Password
                </Label>
                <Input
                  id="wifi_password"
                  type="password"
                  value={settings.wifi_password}
                  onChange={(e) => onSettingsChange({ wifi_password: e.target.value })}
                  placeholder="Enter WiFi password"
                  className="bg-black/50 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mqtt_override" className="text-sm text-gray-300">
                  MQTT Broker Override
                </Label>
                <Input
                  id="mqtt_override"
                  value={settings.mqtt_broker_override || ''}
                  onChange={(e) =>
                    onSettingsChange({
                      mqtt_broker_override: e.target.value || undefined,
                    })
                  }
                  placeholder="Optional: custom MQTT broker URL"
                  className="bg-black/50 border-white/10 text-white"
                />
                <p className="text-[10px] text-gray-500">
                  Leave empty to use the deployed server's broker
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Cloud Tab */}
          <TabsContent value="cloud" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="aws_region" className="text-sm text-gray-300">
                  AWS Region
                </Label>
                <select
                  id="aws_region"
                  value={settings.aws_region}
                  onChange={(e) => onSettingsChange({ aws_region: e.target.value })}
                  className="w-full h-10 px-3 text-sm bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {AWS_REGIONS.map((region) => (
                    <option key={region.value} value={region.value}>
                      {region.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instance_type" className="text-sm text-gray-300">
                  Instance Type
                </Label>
                <select
                  id="instance_type"
                  value={settings.instance_type}
                  onChange={(e) => onSettingsChange({ instance_type: e.target.value })}
                  className="w-full h-10 px-3 text-sm bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {INSTANCE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                      {type.tier && ` - ${type.tier}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auto_destroy" className="text-sm text-gray-300">
                  Auto-Destroy After (hours)
                </Label>
                <Input
                  id="auto_destroy"
                  type="number"
                  min={0}
                  max={24}
                  value={settings.auto_destroy_hours}
                  onChange={(e) =>
                    onSettingsChange({ auto_destroy_hours: parseInt(e.target.value) || 0 })
                  }
                  className="bg-black/50 border-white/10 text-white"
                />
                <p className="text-[10px] text-gray-500">
                  Set to 0 to disable auto-destruction
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Hardware Tab */}
          <TabsContent value="hardware" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto_scan" className="text-sm text-gray-300">
                    Auto-Scan Devices
                  </Label>
                  <p className="text-[10px] text-gray-500">
                    Automatically scan for USB devices periodically
                  </p>
                </div>
                <Switch
                  id="auto_scan"
                  checked={settings.auto_scan_enabled}
                  onCheckedChange={(checked) =>
                    onSettingsChange({ auto_scan_enabled: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scan_interval" className="text-sm text-gray-300">
                  Scan Interval (ms)
                </Label>
                <Input
                  id="scan_interval"
                  type="number"
                  min={500}
                  max={10000}
                  step={500}
                  value={settings.scan_interval_ms}
                  onChange={(e) =>
                    onSettingsChange({ scan_interval_ms: parseInt(e.target.value) || 2000 })
                  }
                  disabled={!settings.auto_scan_enabled}
                  className="bg-black/50 border-white/10 text-white disabled:opacity-50"
                />
                <p className="text-[10px] text-gray-500">
                  How often to scan for new devices (500-10000ms)
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-white/10">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-gray-300"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500">
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
