import React from 'react';
import { useDesignStore } from '../../stores/designStore';
import type { BoardType } from '../../types/design';
import { cn } from '../../lib/utils';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';

interface HardwareSettingsProps {
  className?: string;
}

const boardOptions: { value: BoardType; label: string }[] = [
  { value: 'esp32', label: 'ESP32' },
  { value: 'esp32_s3', label: 'ESP32-S3' },
  { value: 'stm32f103', label: 'STM32F103' },
  { value: 'stm32f4', label: 'STM32F4' },
  { value: 'arduino_uno', label: 'Arduino Uno' },
  { value: 'arduino_nano', label: 'Arduino Nano' },
  { value: 'raspberry_pi_pico', label: 'Raspberry Pi Pico' },
];

const baudRates = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

export const HardwareSettings: React.FC<HardwareSettingsProps> = ({ className }) => {
  const settings = useDesignStore((state) => state.settings.hardware);
  const updateHardwareSettings = useDesignStore((state) => state.updateHardwareSettings);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Default Board Type */}
      <div className="space-y-2">
        <Label htmlFor="default-board" className="text-sm text-gray-300">
          Default Board Type
        </Label>
        <select
          id="default-board"
          value={settings.defaultBoard}
          onChange={(e) =>
            updateHardwareSettings({ defaultBoard: e.target.value as BoardType })
          }
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {boardOptions.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-gray-900">
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-600">
          New devices will default to this board type
        </p>
      </div>

      {/* Serial Baud Rate */}
      <div className="space-y-2">
        <Label htmlFor="serial-baud" className="text-sm text-gray-300">
          Serial Baud Rate
        </Label>
        <select
          id="serial-baud"
          value={settings.serialBaud}
          onChange={(e) =>
            updateHardwareSettings({ serialBaud: parseInt(e.target.value) })
          }
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {baudRates.map((rate) => (
            <option key={rate} value={rate} className="bg-gray-900">
              {rate.toLocaleString()} baud
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-600">
          Used for serial monitor and flashing
        </p>
      </div>

      {/* Auto-detect Ports */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="auto-detect" className="text-sm text-gray-300">
            Auto-detect Ports
          </Label>
          <p className="text-xs text-gray-600 mt-0.5">
            Automatically detect connected USB devices
          </p>
        </div>
        <Switch
          id="auto-detect"
          checked={settings.autoDetectPorts}
          onCheckedChange={(checked) =>
            updateHardwareSettings({ autoDetectPorts: checked })
          }
        />
      </div>

      {/* Flash Verify */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="flash-verify" className="text-sm text-gray-300">
            Verify After Flash
          </Label>
          <p className="text-xs text-gray-600 mt-0.5">
            Read back and verify firmware after flashing
          </p>
        </div>
        <Switch
          id="flash-verify"
          checked={settings.flashVerify}
          onCheckedChange={(checked) =>
            updateHardwareSettings({ flashVerify: checked })
          }
        />
      </div>

      {/* Flashing Tools Info */}
      <div className="pt-4 border-t border-white/10">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
          Flashing Tools
        </h4>
        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>ESP32:</span>
            <span className="font-mono text-gray-400">esptool.py</span>
          </div>
          <div className="flex justify-between">
            <span>STM32:</span>
            <span className="font-mono text-gray-400">stm32flash</span>
          </div>
          <div className="flex justify-between">
            <span>Arduino:</span>
            <span className="font-mono text-gray-400">avrdude</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HardwareSettings;
