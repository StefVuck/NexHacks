import React from 'react';
import { useDesignStore } from '../../stores/designStore';
import { cn } from '../../lib/utils';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';

interface GeneralSettingsProps {
  className?: string;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ className }) => {
  const settings = useDesignStore((state) => state.settings.general);
  const updateGeneralSettings = useDesignStore((state) => state.updateGeneralSettings);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Project Name */}
      <div className="space-y-2">
        <Label htmlFor="project-name" className="text-sm text-gray-300">
          Project Name
        </Label>
        <Input
          id="project-name"
          value={settings.name}
          onChange={(e) => updateGeneralSettings({ name: e.target.value })}
          className="bg-white/5 border-white/10"
          placeholder="My IoT Project"
        />
        <p className="text-xs text-gray-600">
          A descriptive name for your swarm project
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="project-description" className="text-sm text-gray-300">
          Description
        </Label>
        <Textarea
          id="project-description"
          value={settings.description}
          onChange={(e) => updateGeneralSettings({ description: e.target.value })}
          className="bg-white/5 border-white/10 min-h-[80px]"
          placeholder="Describe the purpose and scope of this project..."
        />
      </div>

      {/* Auto-save */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="auto-save" className="text-sm text-gray-300">
              Auto-save
            </Label>
            <p className="text-xs text-gray-600 mt-0.5">
              Automatically save changes periodically
            </p>
          </div>
          <Switch
            id="auto-save"
            checked={settings.autoSave}
            onCheckedChange={(checked) => updateGeneralSettings({ autoSave: checked })}
          />
        </div>

        {settings.autoSave && (
          <div className="space-y-2 pl-4 border-l-2 border-white/10">
            <Label htmlFor="auto-save-interval" className="text-sm text-gray-300">
              Auto-save Interval (seconds)
            </Label>
            <Input
              id="auto-save-interval"
              type="number"
              min={10}
              max={300}
              value={settings.autoSaveInterval}
              onChange={(e) =>
                updateGeneralSettings({ autoSaveInterval: parseInt(e.target.value) || 30 })
              }
              className="bg-white/5 border-white/10 w-24"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneralSettings;
