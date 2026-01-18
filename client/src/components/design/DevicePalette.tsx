import React, { useState } from 'react';
import { DevicePaletteItem } from './DevicePaletteItem';
import type { DevicePaletteItem as DevicePaletteItemType, BoardType } from '../../types/design';
import { cn } from '../../lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import { Search } from 'lucide-react';

// Available device types
const deviceCatalog: DevicePaletteItemType[] = [
  {
    boardType: 'esp32',
    name: 'ESP32',
    description: 'WiFi + BLE microcontroller',
    icon: 'wifi',
    defaultFeatures: [
      { name: 'wifi', enabled: true },
      { name: 'bluetooth', enabled: false },
      { name: 'temperature', enabled: false },
      { name: 'gpio', enabled: true },
    ],
    specs: {
      cpu: 'Dual-core 240MHz',
      memory: '520KB SRAM',
      connectivity: ['WiFi', 'BLE'],
      pins: 38,
    },
  },
  {
    boardType: 'esp32_s3',
    name: 'ESP32-S3',
    description: 'AI-capable WiFi + BLE MCU',
    icon: 'wifi',
    defaultFeatures: [
      { name: 'wifi', enabled: true },
      { name: 'bluetooth', enabled: true },
      { name: 'ai_acceleration', enabled: true },
    ],
    specs: {
      cpu: 'Dual-core 240MHz',
      memory: '512KB SRAM',
      connectivity: ['WiFi', 'BLE 5.0'],
      pins: 45,
    },
  },
  {
    boardType: 'stm32f103',
    name: 'STM32F103',
    description: 'ARM Cortex-M3 MCU',
    icon: 'microchip',
    defaultFeatures: [
      { name: 'uart', enabled: true },
      { name: 'spi', enabled: true },
      { name: 'i2c', enabled: true },
      { name: 'adc', enabled: true },
    ],
    specs: {
      cpu: 'Cortex-M3 72MHz',
      memory: '20KB SRAM',
      connectivity: ['UART', 'SPI', 'I2C'],
      pins: 48,
    },
  },
  {
    boardType: 'stm32f4',
    name: 'STM32F4',
    description: 'High-performance ARM MCU',
    icon: 'microchip',
    defaultFeatures: [
      { name: 'uart', enabled: true },
      { name: 'ethernet', enabled: false },
      { name: 'usb', enabled: true },
      { name: 'dma', enabled: true },
    ],
    specs: {
      cpu: 'Cortex-M4 168MHz',
      memory: '192KB SRAM',
      connectivity: ['UART', 'USB', 'Ethernet'],
      pins: 100,
    },
  },
  {
    boardType: 'arduino_uno',
    name: 'Arduino Uno',
    description: 'Classic ATmega328P board',
    icon: 'circuit-board',
    defaultFeatures: [
      { name: 'serial', enabled: true },
      { name: 'analog_input', enabled: true },
      { name: 'pwm', enabled: true },
    ],
    specs: {
      cpu: 'ATmega328P 16MHz',
      memory: '2KB SRAM',
      connectivity: ['Serial'],
      pins: 14,
    },
  },
  {
    boardType: 'arduino_nano',
    name: 'Arduino Nano',
    description: 'Compact ATmega328P board',
    icon: 'circuit-board',
    defaultFeatures: [
      { name: 'serial', enabled: true },
      { name: 'analog_input', enabled: true },
    ],
    specs: {
      cpu: 'ATmega328P 16MHz',
      memory: '2KB SRAM',
      connectivity: ['Serial'],
      pins: 14,
    },
  },
  {
    boardType: 'raspberry_pi_pico',
    name: 'Raspberry Pi Pico',
    description: 'RP2040 dual-core MCU',
    icon: 'cpu',
    defaultFeatures: [
      { name: 'pio', enabled: true },
      { name: 'adc', enabled: true },
      { name: 'i2c', enabled: true },
      { name: 'spi', enabled: true },
    ],
    specs: {
      cpu: 'Dual-core 133MHz',
      memory: '264KB SRAM',
      connectivity: ['UART', 'SPI', 'I2C'],
      pins: 26,
    },
  },
  {
    boardType: 'server',
    name: 'Aggregation Server',
    description: 'Cloud aggregation endpoint',
    icon: 'server',
    defaultFeatures: [
      { name: 'mqtt_broker', enabled: true },
      { name: 'http_api', enabled: true },
      { name: 'data_storage', enabled: true },
      { name: 'alerting', enabled: false },
    ],
    specs: {
      cpu: 'Cloud VM',
      memory: 'Configurable',
      connectivity: ['MQTT', 'HTTP', 'WebSocket'],
    },
  },
];

// Category groupings
const categories: { name: string; boards: BoardType[] }[] = [
  {
    name: 'WiFi / BLE',
    boards: ['esp32', 'esp32_s3'],
  },
  {
    name: 'ARM Cortex',
    boards: ['stm32f103', 'stm32f4'],
  },
  {
    name: 'Arduino',
    boards: ['arduino_uno', 'arduino_nano'],
  },
  {
    name: 'Other',
    boards: ['raspberry_pi_pico'],
  },
  {
    name: 'Infrastructure',
    boards: ['server'],
  },
];

interface DevicePaletteProps {
  className?: string;
  onDeviceSelect?: (device: DevicePaletteItemType) => void;
}

export const DevicePalette: React.FC<DevicePaletteProps> = ({ className, onDeviceSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    categories.map((c) => c.name)
  );

  // Filter devices by search query
  const filteredDevices = deviceCatalog.filter(
    (device) =>
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.boardType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const getDevicesForCategory = (boards: BoardType[]) =>
    filteredDevices.filter((d) => boards.includes(d.boardType));

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Search */}
      <div className="p-3 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search devices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-sm"
          />
        </div>
      </div>

      {/* Device list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {categories.map((category) => {
            const categoryDevices = getDevicesForCategory(category.boards);
            if (categoryDevices.length === 0) return null;

            const isExpanded = expandedCategories.includes(category.name);

            return (
              <div key={category.name}>
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(category.name)}
                  className="flex items-center justify-between w-full mb-2 group"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 group-hover:text-gray-400 transition-colors">
                    {category.name}
                  </span>
                  <svg
                    className={cn(
                      'w-4 h-4 text-gray-600 transition-transform',
                      isExpanded && 'rotate-180'
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Category items */}
                {isExpanded && (
                  <div className="space-y-2">
                    {categoryDevices.map((device) => (
                      <DevicePaletteItem
                        key={device.boardType}
                        item={device}
                        onClick={() => onDeviceSelect?.(device)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* No results */}
          {filteredDevices.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No devices match your search</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Palette footer hint */}
      <div className="p-4 border-t border-white/10 bg-white/[0.02]">
        <p className="text-xs text-gray-400 text-center">
          Drag devices onto the canvas to add them
        </p>
      </div>
    </div>
  );
};

export default DevicePalette;
