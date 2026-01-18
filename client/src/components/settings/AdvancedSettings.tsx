import React from 'react';
import { useDesignStore } from '../../stores/designStore';
import { cn } from '../../lib/utils';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { AlertTriangle } from 'lucide-react';

interface AdvancedSettingsProps {
  className?: string;
}

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({ className }) => {
  const settings = useDesignStore((state) => state.settings.advanced);
  const updateAdvancedSettings = useDesignStore((state) => state.updateAdvancedSettings);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Warning */}
      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-amber-400 font-medium">Advanced Settings</p>
            <p className="text-xs text-amber-400/80 mt-1">
              These settings affect build and simulation behavior. Modify with caution.
            </p>
          </div>
        </div>
      </div>

      {/* Max Build Iterations */}
      <div className="space-y-2">
        <Label htmlFor="max-iterations" className="text-sm text-gray-300">
          Max Build Iterations
        </Label>
        <Input
          id="max-iterations"
          type="number"
          min={1}
          max={10}
          value={settings.maxBuildIterations}
          onChange={(e) =>
            updateAdvancedSettings({
              maxBuildIterations: parseInt(e.target.value) || 3,
            })
          }
          className="bg-white/5 border-white/10 w-24"
        />
        <p className="text-xs text-gray-600">
          Number of retry attempts when compilation fails (1-10)
        </p>
      </div>

      {/* Simulation Timeout */}
      <div className="space-y-2">
        <Label htmlFor="sim-timeout" className="text-sm text-gray-300">
          Simulation Timeout (seconds)
        </Label>
        <Input
          id="sim-timeout"
          type="number"
          min={10}
          max={600}
          value={settings.simulationTimeout}
          onChange={(e) =>
            updateAdvancedSettings({
              simulationTimeout: parseInt(e.target.value) || 60,
            })
          }
          className="bg-white/5 border-white/10 w-24"
        />
        <p className="text-xs text-gray-600">
          Maximum time to wait for simulation completion (10-600)
        </p>
      </div>

      {/* Debug Mode */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="debug-mode" className="text-sm text-gray-300">
            Debug Mode
          </Label>
          <p className="text-xs text-gray-600 mt-0.5">
            Include debug symbols and extra logging in firmware
          </p>
        </div>
        <Switch
          id="debug-mode"
          checked={settings.debugMode}
          onCheckedChange={(checked) =>
            updateAdvancedSettings({ debugMode: checked })
          }
        />
      </div>

      {/* Verbose Logging */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="verbose-logging" className="text-sm text-gray-300">
            Verbose Logging
          </Label>
          <p className="text-xs text-gray-600 mt-0.5">
            Show detailed logs during build and simulation
          </p>
        </div>
        <Switch
          id="verbose-logging"
          checked={settings.verboseLogging}
          onCheckedChange={(checked) =>
            updateAdvancedSettings({ verboseLogging: checked })
          }
        />
      </div>

      {/* Debug Info Display */}
      {(settings.debugMode || settings.verboseLogging) && (
        <div className="pt-4 border-t border-white/10">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
            Debug Output Location
          </h4>
          <div className="space-y-2 text-xs">
            <div className="p-2 rounded bg-white/5 font-mono text-gray-400">
              <span className="text-gray-600"># Build logs:</span>
              <br />
              builds/logs/build_{'<timestamp>'}.log
            </div>
            <div className="p-2 rounded bg-white/5 font-mono text-gray-400">
              <span className="text-gray-600"># Simulation output:</span>
              <br />
              builds/logs/sim_{'<timestamp>'}.log
            </div>
          </div>
        </div>
      )}

      {/* Reset to Defaults */}
      <div className="pt-4 border-t border-white/10">
        <button
          onClick={() => {
            updateAdvancedSettings({
              maxBuildIterations: 3,
              simulationTimeout: 60,
              debugMode: false,
              verboseLogging: false,
            });
          }}
          className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
};

export default AdvancedSettings;
