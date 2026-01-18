/**
 * Node Panel Component - Side panel showing node status and readings
 */

import React from 'react';
import { NodeSimulationState } from '../../api/client';
import { cn } from '../../lib/utils';
import { Activity, Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface NodePanelProps {
  nodes: NodeSimulationState[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

export function NodePanel({ nodes, selectedNodeId, onSelectNode }: NodePanelProps) {
  return (
    <div className="max-h-[300px] overflow-y-auto">
      {nodes.length === 0 ? (
        <div className="p-4 text-center text-gray-500 text-sm">
          No nodes available
        </div>
      ) : (
        <div className="divide-y divide-gray-800">
          {nodes.map((node) => (
            <button
              key={node.node_id}
              onClick={() => onSelectNode(node.node_id)}
              className={cn(
                'w-full p-3 text-left hover:bg-gray-800/50 transition-colors',
                selectedNodeId === node.node_id && 'bg-gray-800 border-l-2 border-blue-500'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {node.status === 'online' ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : node.status === 'error' ? (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-gray-500" />
                  )}
                  <span className="font-mono text-sm">{node.node_id}</span>
                </div>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded',
                    node.status === 'online'
                      ? 'bg-green-900/50 text-green-400'
                      : node.status === 'error'
                      ? 'bg-red-900/50 text-red-400'
                      : 'bg-gray-800 text-gray-400'
                  )}
                >
                  {node.status}
                </span>
              </div>

              {/* Latest readings */}
              {Object.keys(node.latest_readings).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(node.latest_readings).map(([key, value]) => (
                    <span
                      key={key}
                      className="text-xs bg-gray-800 px-2 py-1 rounded"
                    >
                      <span className="text-gray-400">{key}:</span>{' '}
                      <span className="text-white">
                        {typeof value === 'number' ? value.toFixed(1) : value}
                      </span>
                    </span>
                  ))}
                </div>
              )}

              {/* Message count */}
              <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                <Activity className="h-3 w-3" />
                {node.message_count} messages
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
