/**
 * Topology View Component - Visual representation of node network
 */

import React, { useMemo } from 'react';
import { NodeSimulationState, SimulationMessage } from '../../api/client';
import { cn } from '../../lib/utils';
import { Cpu, Server, Radio } from 'lucide-react';

interface TopologyViewProps {
  nodes: NodeSimulationState[];
  messages: SimulationMessage[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
}

export function TopologyView({
  nodes,
  messages,
  selectedNodeId,
  onSelectNode,
}: TopologyViewProps) {
  // Calculate positions for nodes in a semi-circle around broker/server
  const positions = useMemo(() => {
    const centerX = 50;
    const centerY = 60;
    const radius = 35;

    const nodePositions: Record<string, { x: number; y: number }> = {
      broker: { x: centerX, y: centerY - 15 },
      server: { x: centerX, y: centerY + 15 },
    };

    nodes.forEach((node, i) => {
      const angle = (Math.PI / (nodes.length + 1)) * (i + 1);
      nodePositions[node.node_id] = {
        x: centerX - radius * Math.cos(angle),
        y: centerY - radius * Math.sin(angle),
      };
    });

    return nodePositions;
  }, [nodes]);

  // Get recent messages for animation (last 5)
  const recentMessages = messages.slice(-5);

  return (
    <div className="relative w-full h-full bg-[#0d0d0d]">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {/* Connection lines */}
        {nodes.map((node) => {
          const nodePos = positions[node.node_id];
          const brokerPos = positions.broker;
          if (!nodePos || !brokerPos) return null;

          return (
            <line
              key={`line-${node.node_id}`}
              x1={nodePos.x}
              y1={nodePos.y}
              x2={brokerPos.x}
              y2={brokerPos.y}
              stroke="#374151"
              strokeWidth="0.3"
              strokeDasharray="1,1"
            />
          );
        })}

        {/* Broker to Server line */}
        {positions.broker && positions.server && (
          <line
            x1={positions.broker.x}
            y1={positions.broker.y}
            x2={positions.server.x}
            y2={positions.server.y}
            stroke="#374151"
            strokeWidth="0.3"
          />
        )}

        {/* Animated message particles */}
        {recentMessages.map((msg, i) => {
          const fromPos = positions[msg.from_node];
          const toPos = positions[msg.to_node];
          if (!fromPos || !toPos) return null;

          return (
            <circle
              key={`msg-${i}`}
              r="1"
              fill="#3b82f6"
              opacity={0.8}
            >
              <animate
                attributeName="cx"
                from={fromPos.x}
                to={toPos.x}
                dur="0.5s"
                begin={`${i * 0.1}s`}
                repeatCount="1"
              />
              <animate
                attributeName="cy"
                from={fromPos.y}
                to={toPos.y}
                dur="0.5s"
                begin={`${i * 0.1}s`}
                repeatCount="1"
              />
              <animate
                attributeName="opacity"
                from="0.8"
                to="0"
                dur="0.5s"
                begin={`${i * 0.1}s`}
                repeatCount="1"
              />
            </circle>
          );
        })}

        {/* Broker node */}
        {positions.broker && (
          <g
            transform={`translate(${positions.broker.x}, ${positions.broker.y})`}
            className="cursor-pointer"
            onClick={() => onSelectNode(null)}
          >
            <circle r="5" fill="#1f2937" stroke="#6b7280" strokeWidth="0.5" />
            <text
              y="9"
              textAnchor="middle"
              className="fill-gray-400 text-[3px]"
            >
              MQTT Broker
            </text>
          </g>
        )}

        {/* Server node */}
        {positions.server && (
          <g
            transform={`translate(${positions.server.x}, ${positions.server.y})`}
            className="cursor-pointer"
            onClick={() => onSelectNode(null)}
          >
            <rect x="-5" y="-4" width="10" height="8" rx="1" fill="#1f2937" stroke="#6b7280" strokeWidth="0.5" />
            <text
              y="8"
              textAnchor="middle"
              className="fill-gray-400 text-[3px]"
            >
              Server
            </text>
          </g>
        )}

        {/* Sensor nodes */}
        {nodes.map((node) => {
          const pos = positions[node.node_id];
          if (!pos) return null;

          const isSelected = node.node_id === selectedNodeId;
          const isOnline = node.status === 'online';

          return (
            <g
              key={node.node_id}
              transform={`translate(${pos.x}, ${pos.y})`}
              className="cursor-pointer"
              onClick={() => onSelectNode(node.node_id)}
            >
              {/* Node circle */}
              <circle
                r="4"
                fill={isOnline ? '#065f46' : '#1f2937'}
                stroke={isSelected ? '#3b82f6' : isOnline ? '#10b981' : '#6b7280'}
                strokeWidth={isSelected ? '1' : '0.5'}
              />

              {/* Status pulse for online nodes */}
              {isOnline && (
                <circle r="4" fill="none" stroke="#10b981" strokeWidth="0.5">
                  <animate
                    attributeName="r"
                    from="4"
                    to="7"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.6"
                    to="0"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* Label */}
              <text
                y="8"
                textAnchor="middle"
                className={cn(
                  'text-[3px]',
                  isSelected ? 'fill-blue-400' : 'fill-gray-300'
                )}
              >
                {node.node_id}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          Online
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-gray-600" />
          Offline
        </div>
      </div>
    </div>
  );
}
