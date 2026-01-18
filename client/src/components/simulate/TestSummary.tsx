/**
 * Test Summary Component - Shows overall test results
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { CheckCircle2, XCircle } from 'lucide-react';

interface TestSummaryProps {
  testSummary: Record<string, boolean>;
}

export function TestSummary({ testSummary }: TestSummaryProps) {
  const tests = Object.entries(testSummary);
  const passed = tests.filter(([, v]) => v).length;
  const failed = tests.filter(([, v]) => !v).length;

  if (tests.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        No test results yet
      </div>
    );
  }

  return (
    <div>
      {/* Summary bar */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-400">{passed} passed</span>
          </div>
          {failed > 0 && (
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-400">{failed} failed</span>
            </div>
          )}
        </div>
      </div>

      {/* Test list */}
      <div className="max-h-[200px] overflow-y-auto divide-y divide-gray-800">
        {tests.map(([name, passed]) => {
          // Parse node:assertion format
          const [nodeId, assertion] = name.includes(':')
            ? name.split(':')
            : ['', name];

          return (
            <div
              key={name}
              className={cn(
                'flex items-center gap-3 px-4 py-2',
                passed ? 'bg-green-900/10' : 'bg-red-900/10'
              )}
            >
              {passed ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{assertion}</div>
                {nodeId && (
                  <div className="text-xs text-gray-500">{nodeId}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
