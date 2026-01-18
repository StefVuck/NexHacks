import React, { useState } from 'react';
import { useDesignStore } from '../../stores/designStore';
import { useDesign } from '../../hooks/useDesign';
import { cn } from '../../lib/utils';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Sparkles, Loader2, Wand2, RotateCcw } from 'lucide-react';

interface PromptInputProps {
  className?: string;
}

// Example prompts for inspiration
const examplePrompts = [
  '5 temperature sensors in a warehouse, reporting to a central server every 30 seconds',
  'Smart greenhouse with humidity, temperature, and light sensors connected via MQTT',
  'Industrial monitoring system with 3 STM32 nodes and 1 ESP32 gateway',
  'Fleet of 4 delivery robots with GPS and obstacle detection',
];

export const PromptInput: React.FC<PromptInputProps> = ({ className }) => {
  const prompt = useDesignStore((state) => state.prompt);
  const setPrompt = useDesignStore((state) => state.setPrompt);
  const isLoading = useDesignStore((state) => state.isLoading);
  const devices = useDesignStore((state) => state.devices);
  const importDesign = useDesignStore((state) => state.importDesign);

  const { parsePrompt } = useDesign();
  const [showExamples, setShowExamples] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;

    const result = await parsePrompt(prompt);

    if (result) {
      // Convert parsed devices to full Device objects
      const newDevices = result.devices.map((d, idx) => ({
        ...d,
        id: `device-${Date.now()}-${idx}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));

      const newConnections = result.connections.map((c, idx) => ({
        ...c,
        id: `conn-${Date.now()}-${idx}`,
      }));

      importDesign(newDevices, newConnections);

      // TODO: Apply suggested settings if provided
      // if (result.suggestedSettings) {
      //   updateSettings(result.suggestedSettings);
      // }
    }
  };

  const handleClear = () => {
    setPrompt('');
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
    setShowExamples(false);
  };

  const hasDevices = devices.length > 0;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Prompt textarea */}
      <div className="relative">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your IoT system..."
          className={cn(
            'min-h-[100px] bg-white/5 border-white/10 text-sm resize-none',
            'placeholder:text-gray-600',
            'focus:border-blue-500/50 focus:ring-blue-500/20'
          )}
          disabled={isLoading}
        />

        {/* Character count */}
        <div className="absolute bottom-2 right-2 text-[10px] text-gray-600">
          {prompt.length}/1000
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isLoading}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
          size="sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Layout
            </>
          )}
        </Button>

        {prompt && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="border-white/10 text-gray-400 hover:text-white"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Examples toggle */}
      <button
        onClick={() => setShowExamples(!showExamples)}
        className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-400 transition-colors"
      >
        <Wand2 className="w-3 h-3" />
        {showExamples ? 'Hide examples' : 'Show examples'}
      </button>

      {/* Example prompts */}
      {showExamples && (
        <div className="space-y-2">
          {examplePrompts.map((example, idx) => (
            <button
              key={idx}
              onClick={() => handleExampleClick(example)}
              className={cn(
                'w-full text-left p-2 rounded text-[11px] text-gray-500',
                'bg-white/[0.02] hover:bg-white/[0.05] border border-transparent',
                'hover:border-white/10 transition-all duration-150'
              )}
            >
              "{example}"
            </button>
          ))}
        </div>
      )}

      {/* Warning if devices exist */}
      {hasDevices && (
        <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
          <svg
            className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-[10px] text-amber-400">
            Generating a new layout will replace existing devices.
          </p>
        </div>
      )}
    </div>
  );
};

export default PromptInput;
