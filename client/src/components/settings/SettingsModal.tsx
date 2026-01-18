import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { GeneralSettings } from './GeneralSettings';
import { NetworkSettings } from './NetworkSettings';
import { HardwareSettings } from './HardwareSettings';
import { CloudSettings } from './CloudSettings';
import { AdvancedSettings } from './AdvancedSettings';
import {
  Settings,
  Wifi,
  Cpu,
  Cloud,
  Sliders,
} from 'lucide-react';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const tabs = [
  { value: 'general', label: 'General', icon: Settings },
  { value: 'network', label: 'Network', icon: Wifi },
  { value: 'hardware', label: 'Hardware', icon: Cpu },
  { value: 'cloud', label: 'Cloud', icon: Cloud },
  { value: 'advanced', label: 'Advanced', icon: Sliders },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[600px] p-0 bg-[#121212] border-white/10">
        <DialogHeader className="px-6 py-4 border-b border-white/10">
          <DialogTitle className="text-lg font-semibold text-white">
            Project Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex h-[calc(100%-65px)]"
        >
          {/* Sidebar tabs */}
          <div className="w-48 border-r border-white/10 p-2">
            <TabsList className="flex flex-col h-auto bg-transparent space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className={cn(
                      'w-full justify-start gap-2 px-3 py-2 text-sm',
                      'data-[state=active]:bg-white/10 data-[state=active]:text-white',
                      'data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-300',
                      'data-[state=inactive]:hover:bg-white/5'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                <TabsContent value="general" className="mt-0">
                  <GeneralSettings />
                </TabsContent>

                <TabsContent value="network" className="mt-0">
                  <NetworkSettings />
                </TabsContent>

                <TabsContent value="hardware" className="mt-0">
                  <HardwareSettings />
                </TabsContent>

                <TabsContent value="cloud" className="mt-0">
                  <CloudSettings />
                </TabsContent>

                <TabsContent value="advanced" className="mt-0">
                  <AdvancedSettings />
                </TabsContent>
              </div>
            </ScrollArea>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
