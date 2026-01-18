import React, { useState } from 'react';
import { useDesignStore } from '../../stores/designStore';
import type { Device, DeviceFeature, TestAssertion, BoardType } from '../../types/design';
import { cn } from '../../lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import {
  Cpu,
  Wifi,
  Server,
  Microchip,
  CircuitBoard,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

// Board options for dropdown
const boardOptions: { value: BoardType; label: string }[] = [
  { value: 'esp32', label: 'ESP32' },
  { value: 'esp32_s3', label: 'ESP32-S3' },
  { value: 'stm32f103', label: 'STM32F103' },
  { value: 'stm32f4', label: 'STM32F4' },
  { value: 'arduino_uno', label: 'Arduino Uno' },
  { value: 'arduino_nano', label: 'Arduino Nano' },
  { value: 'raspberry_pi_pico', label: 'Raspberry Pi Pico' },
  { value: 'server', label: 'Aggregation Server' },
];

// Available features by board type
const featuresByBoard: Record<BoardType, string[]> = {
  esp32: ['wifi', 'bluetooth', 'temperature', 'humidity', 'gpio', 'adc', 'pwm', 'i2c', 'spi'],
  esp32_s3: ['wifi', 'bluetooth', 'ai_acceleration', 'usb', 'gpio', 'adc', 'lcd'],
  stm32f103: ['uart', 'spi', 'i2c', 'adc', 'pwm', 'gpio', 'timer', 'rtc'],
  stm32f4: ['uart', 'ethernet', 'usb', 'spi', 'i2c', 'adc', 'dma', 'gpio'],
  arduino_uno: ['serial', 'analog_input', 'pwm', 'gpio', 'i2c', 'spi'],
  arduino_nano: ['serial', 'analog_input', 'pwm', 'gpio'],
  raspberry_pi_pico: ['pio', 'adc', 'i2c', 'spi', 'uart', 'gpio', 'pwm'],
  server: ['mqtt_broker', 'http_api', 'data_storage', 'alerting', 'websocket', 'database'],
};

interface DeviceConfigPanelProps {
  device: Device;
  className?: string;
}

export const DeviceConfigPanel: React.FC<DeviceConfigPanelProps> = ({
  device,
  className,
}) => {
  const updateDevice = useDesignStore((state) => state.updateDevice);
  const removeDevice = useDesignStore((state) => state.removeDevice);

  const [expandedSections, setExpandedSections] = useState<string[]>([
    'basic',
    'features',
    'assertions',
  ]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  // Handle field updates
  const handleUpdateField = (field: keyof Device, value: unknown) => {
    updateDevice(device.id, { [field]: value });
  };

  // Handle feature toggle
  const handleFeatureToggle = (featureName: string, enabled: boolean) => {
    const existingFeature = device.features.find((f) => f.name === featureName);

    if (existingFeature) {
      // Update existing feature
      const updatedFeatures = device.features.map((f) =>
        f.name === featureName ? { ...f, enabled } : f
      );
      handleUpdateField('features', updatedFeatures);
    } else {
      // Add new feature
      const newFeature: DeviceFeature = {
        id: `feature-${Date.now()}`,
        name: featureName,
        enabled,
      };
      handleUpdateField('features', [...device.features, newFeature]);
    }
  };

  // Handle assertion add
  const handleAddAssertion = () => {
    const newAssertion: TestAssertion = {
      id: `assertion-${Date.now()}`,
      description: '',
      condition: '',
    };
    handleUpdateField('assertions', [...device.assertions, newAssertion]);
  };

  // Handle assertion update
  const handleUpdateAssertion = (
    assertionId: string,
    field: keyof TestAssertion,
    value: string
  ) => {
    const updatedAssertions = device.assertions.map((a) =>
      a.id === assertionId ? { ...a, [field]: value } : a
    );
    handleUpdateField('assertions', updatedAssertions);
  };

  // Handle assertion remove
  const handleRemoveAssertion = (assertionId: string) => {
    const updatedAssertions = device.assertions.filter((a) => a.id !== assertionId);
    handleUpdateField('assertions', updatedAssertions);
  };

  const availableFeatures = featuresByBoard[device.boardType] || [];
  const isExpanded = (section: string) => expandedSections.includes(section);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Device Configuration</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeDevice(device.id)}
            className="text-gray-500 hover:text-red-400"
            title="Delete device"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">{device.nodeId}</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Basic Info Section */}
          <div>
            <button
              onClick={() => toggleSection('basic')}
              className="flex items-center justify-between w-full mb-3"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Basic Info
              </span>
              {isExpanded('basic') ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>

            {isExpanded('basic') && (
              <div className="space-y-3">
                {/* Node ID */}
                <div>
                  <Label className="text-xs text-gray-500">Node ID</Label>
                  <Input
                    value={device.nodeId}
                    onChange={(e) => handleUpdateField('nodeId', e.target.value)}
                    className="mt-1 bg-white/5 border-white/10 text-sm"
                    placeholder="sensor_1"
                  />
                </div>

                {/* Name */}
                <div>
                  <Label className="text-xs text-gray-500">Display Name</Label>
                  <Input
                    value={device.name}
                    onChange={(e) => handleUpdateField('name', e.target.value)}
                    className="mt-1 bg-white/5 border-white/10 text-sm"
                    placeholder="Temperature Sensor"
                  />
                </div>

                {/* Board Type */}
                <div>
                  <Label className="text-xs text-gray-500">Board Type</Label>
                  <select
                    value={device.boardType}
                    onChange={(e) =>
                      handleUpdateField('boardType', e.target.value as BoardType)
                    }
                    className="mt-1 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {boardOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-gray-900">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description / Role - Critical for Claude */}
                <div>
                  <Label className="text-xs text-gray-500">
                    Node Role <span className="text-blue-400">(Used by Claude)</span>
                  </Label>
                  <Textarea
                    value={device.description}
                    onChange={(e) => handleUpdateField('description', e.target.value)}
                    className="mt-1 bg-white/5 border-white/10 text-sm min-h-[80px] border-blue-500/30"
                    placeholder="e.g., 'Traffic counter sensor on Highway 101 that counts passing vehicles and reports count every 10 seconds'"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Describe what this node does in your system. This is sent to Claude for code generation.
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator className="bg-white/10" />

          {/* Features Section */}
          <div>
            <button
              onClick={() => toggleSection('features')}
              className="flex items-center justify-between w-full mb-3"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Features ({device.features.filter((f) => f.enabled).length})
              </span>
              {isExpanded('features') ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>

            {isExpanded('features') && (
              <div className="space-y-2">
                {availableFeatures.map((featureName) => {
                  const feature = device.features.find((f) => f.name === featureName);
                  const isEnabled = feature?.enabled ?? false;

                  return (
                    <div
                      key={featureName}
                      className="flex items-center gap-2 p-2 rounded bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                    >
                      <Checkbox
                        id={`feature-${featureName}`}
                        checked={isEnabled}
                        onCheckedChange={(checked) =>
                          handleFeatureToggle(featureName, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`feature-${featureName}`}
                        className="text-sm text-gray-300 cursor-pointer flex-1"
                      >
                        {featureName.replace(/_/g, ' ')}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator className="bg-white/10" />

          {/* Test Assertions Section */}
          <div>
            <button
              onClick={() => toggleSection('assertions')}
              className="flex items-center justify-between w-full mb-3"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Test Assertions ({device.assertions.length})
              </span>
              {isExpanded('assertions') ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>

            {isExpanded('assertions') && (
              <div className="space-y-3">
                {device.assertions.map((assertion) => (
                  <div
                    key={assertion.id}
                    className="p-3 rounded-lg border border-white/10 bg-white/[0.02]"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Input
                        value={assertion.description}
                        onChange={(e) =>
                          handleUpdateAssertion(assertion.id, 'description', e.target.value)
                        }
                        className="bg-transparent border-none text-sm p-0 h-auto focus-visible:ring-0"
                        placeholder="Description (e.g., Reports temperature)"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAssertion(assertion.id)}
                        className="h-6 w-6 text-gray-600 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <Input
                      value={assertion.condition}
                      onChange={(e) =>
                        handleUpdateAssertion(assertion.id, 'condition', e.target.value)
                      }
                      className="bg-white/5 border-white/10 text-xs font-mono"
                      placeholder='Condition (e.g., output contains "temp")'
                    />
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddAssertion}
                  className="w-full border-dashed border-white/20 text-gray-400 hover:text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Assertion
                </Button>
              </div>
            )}
          </div>

          <Separator className="bg-white/10" />

          {/* Position Info (read-only) */}
          <div className="text-xs text-gray-600">
            <span>Position: </span>
            <span className="font-mono">
              ({Math.round(device.position.x)}, {Math.round(device.position.y)})
            </span>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default DeviceConfigPanel;
