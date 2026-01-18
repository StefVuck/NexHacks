/**
 * Message Log Component - Scrolling list of simulation messages
 */

import React, { useEffect, useRef } from 'react';
import { SimulationMessage } from '../../api/client';
import { cn } from '../../lib/utils';
import { ArrowRight } from 'lucide-react';

interface MessageLogProps {
  messages: SimulationMessage[];
  onFilterByNode: (nodeId: string) => void;
}

export function MessageLog({ messages, onFilterByNode }: MessageLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 2,
    });
  };

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
          No messages yet
        </div>
      ) : (
        <div className="divide-y divide-gray-800">
          {messages.map((msg, i) => (
            <div
              key={i}
              className="p-3 hover:bg-gray-800/30 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 font-mono text-xs">
                  {formatTimestamp(msg.timestamp)}
                </span>
                <button
                  onClick={() => onFilterByNode(msg.from_node)}
                  className="text-blue-400 hover:text-blue-300 font-mono"
                >
                  {msg.from_node}
                </button>
                <ArrowRight className="h-3 w-3 text-gray-600" />
                <button
                  onClick={() => onFilterByNode(msg.to_node)}
                  className="text-green-400 hover:text-green-300 font-mono"
                >
                  {msg.to_node}
                </button>
                {msg.topic && (
                  <span className="text-gray-500 text-xs truncate">
                    [{msg.topic}]
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs">
                <code className="text-gray-300 bg-black/30 px-2 py-1 rounded">
                  {JSON.stringify(msg.payload)}
                </code>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
