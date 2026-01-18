/**
 * Simulate Stage Page - /simulate/{id}
 *
 * Real-time simulation visualization with topology and message flow.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSimulation } from '../hooks/useSimulation';
import { useProjects } from '../hooks/useProjects';
import { useProjectStore } from '../stores/projectStore';
import { TopologyView } from '../components/simulate/TopologyView';
import { MessageLog } from '../components/simulate/MessageLog';
import { NodePanel } from '../components/simulate/NodePanel';
import { SpeedControl } from '../components/simulate/SpeedControl';
import { TestSummary } from '../components/simulate/TestSummary';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  Square,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  FolderOpen,
} from 'lucide-react';

export default function SimulatePage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterNodeId, setFilterNodeId] = useState<string | null>(null);
  const currentProject = useProjectStore((state) => state.currentProject);
  const { loadProject } = useProjects();
  const projectName = currentProject?.name || 'Simulate';

  const {
    status,
    speed,
    elapsedTimeMs,
    nodes,
    messages,
    testSummary,
    error,
    isConnected,
    isLoading,
    initSession,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
    setSpeed,
  } = useSimulation();

  // Load project if not already loaded
  useEffect(() => {
    if (sessionId && (!currentProject || currentProject.id !== sessionId)) {
      loadProject(sessionId);
    }
  }, [sessionId, currentProject, loadProject]);

  // Initialize session on mount
  useEffect(() => {
    if (sessionId) {
      initSession(sessionId);
    }
  }, [sessionId, initSession]);

  const nodeList = Object.values(nodes);
  const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null;

  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isStopped = status === 'stopped' || status === 'completed';
  const isIdle = status === 'idle';

  const handleStart = () => {
    if (sessionId) {
      startSimulation(sessionId, 30, speed);
    }
  };

  const handleRestart = () => {
    if (sessionId) {
      startSimulation(sessionId, 30, speed);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const filteredMessages = filterNodeId
    ? messages.filter(
        (m) => m.from_node === filterNodeId || m.to_node === filterNodeId
      )
    : messages;

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#1a1a1a]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/projects')}
                className="text-gray-400 hover:text-white"
                title="Back to Projects"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/build/${sessionId}`)}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Build
              </Button>
              <div className="h-6 w-px bg-gray-700" />
              <div>
                <h1 className="text-xl font-semibold">{projectName}</h1>
                <p className="text-xs text-gray-500">Simulate Stage</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className="flex items-center gap-2 text-sm">
                {isConnected ? (
                  <>
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span className="text-green-500">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-red-500" />
                    <span className="text-red-500">Disconnected</span>
                  </>
                )}
              </div>

              {/* Elapsed Time */}
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="h-4 w-4" />
                <span>{formatTime(elapsedTimeMs)}</span>
              </div>

              {/* Speed Control */}
              <SpeedControl speed={speed} onSpeedChange={setSpeed} disabled={!isRunning && !isPaused} />
            </div>
          </div>
        </div>
      </header>

      {/* Controls Bar */}
      <div className="bg-[#1a1a1a] border-b border-gray-800">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isIdle && (
                <Button
                  onClick={handleStart}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isLoading}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Simulation
                </Button>
              )}

              {isRunning && (
                <Button
                  onClick={pauseSimulation}
                  variant="outline"
                  className="border-gray-700"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              )}

              {isPaused && (
                <Button
                  onClick={resumeSimulation}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
              )}

              {(isRunning || isPaused) && (
                <Button
                  onClick={stopSimulation}
                  variant="outline"
                  className="border-gray-700"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              )}

              {isStopped && (
                <Button
                  onClick={handleRestart}
                  variant="outline"
                  className="border-gray-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Restart
                </Button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">
                {nodeList.filter((n) => n.status === 'online').length} / {nodeList.length} nodes online
              </span>
              <span className="text-sm text-gray-400">
                {messages.length} messages
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left - Topology View */}
          <div className="col-span-8">
            <Card className="bg-[#1a1a1a] border-gray-800 h-[400px] overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <h2 className="text-lg font-medium">Network Topology</h2>
              </div>
              <TopologyView
                nodes={nodeList}
                messages={messages}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
              />
            </Card>

            {/* Message Log */}
            <Card className="bg-[#1a1a1a] border-gray-800 mt-6 h-[300px] overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-lg font-medium">Message Log</h2>
                {filterNodeId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilterNodeId(null)}
                    className="text-gray-400"
                  >
                    Clear filter
                  </Button>
                )}
              </div>
              <MessageLog
                messages={filteredMessages}
                onFilterByNode={setFilterNodeId}
              />
            </Card>
          </div>

          {/* Right - Side Panel */}
          <div className="col-span-4 space-y-6">
            {/* Node Panel */}
            <Card className="bg-[#1a1a1a] border-gray-800">
              <div className="p-4 border-b border-gray-800">
                <h2 className="text-lg font-medium">Node Status</h2>
              </div>
              <NodePanel
                nodes={nodeList}
                selectedNodeId={selectedNodeId}
                onSelectNode={(id) => {
                  setSelectedNodeId(id);
                  setFilterNodeId(id);
                }}
              />
            </Card>

            {/* Test Summary */}
            <Card className="bg-[#1a1a1a] border-gray-800">
              <div className="p-4 border-b border-gray-800">
                <h2 className="text-lg font-medium">Test Summary</h2>
              </div>
              <TestSummary testSummary={testSummary} />
            </Card>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mt-4 p-4 bg-red-900/20 border-red-800">
            <div className="flex items-center gap-2 text-red-400">
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end mt-6">
          <Button
            onClick={() => navigate(`/deploy/${sessionId}`)}
            disabled={status !== 'completed'}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Continue to Deploy
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
