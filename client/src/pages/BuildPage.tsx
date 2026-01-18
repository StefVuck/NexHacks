/**
 * Build Stage Page - /build/{id}
 *
 * Displays firmware generation progress with node list and detail panel.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBuild } from '../hooks/useBuild';
import { useProjects } from '../hooks/useProjects';
import { useProjectStore } from '../stores/projectStore';
import { useDesignStore } from '../stores/designStore';
import { buildApi, BuildNode } from '../api/client';
import { NodeList } from '../components/build/NodeList';
import { DetailPanel } from '../components/build/DetailPanel';
import { BuildProgress } from '../components/build/BuildProgress';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import {
  ArrowLeft,
  ArrowRight,
  Square,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Wifi,
  WifiOff,
  FolderOpen,
} from 'lucide-react';

export default function BuildPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isStartingBuild, setIsStartingBuild] = useState(false);
  const buildStartedRef = useRef(false);
  const currentProject = useProjectStore((state) => state.currentProject);
  const devices = useDesignStore((state) => state.devices);
  const settings = useDesignStore((state) => state.settings);
  const { loadProject } = useProjects();
  const projectName = currentProject?.name || 'Build';

  const {
    status,
    nodes,
    currentNode,
    completedCount,
    totalCount,
    error,
    isConnected,
    loadSession,
    cancelBuild,
    retryNode,
    skipNode,
  } = useBuild();

  // Load project if not already loaded
  useEffect(() => {
    if (sessionId && (!currentProject || currentProject.id !== sessionId)) {
      loadProject(sessionId);
    }
  }, [sessionId, currentProject, loadProject]);

  // Load existing session on mount
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    }
  }, [sessionId, loadSession]);

  // Auto-start build if no build is running and we have devices
  useEffect(() => {
    const shouldStartBuild =
      sessionId &&
      status === 'idle' &&
      totalCount === 0 &&
      devices.length > 0 &&
      !isStartingBuild &&
      !buildStartedRef.current;

    if (shouldStartBuild) {
      buildStartedRef.current = true;
      setIsStartingBuild(true);

      // Build nodes from devices
      const buildNodes: BuildNode[] = devices.map(d => ({
        node_id: d.nodeId,
        description: d.description || d.name,
        board_type: d.boardType || settings.hardware.defaultBoard,
        assertions: d.assertions.map(a => ({
          name: a.description,
          pattern: a.condition,
          required: true,
        })),
      }));

      const defaultBoardId = devices[0]?.boardType || settings.hardware.defaultBoard;

      buildApi.start({
        description: settings.general.description || 'Swarm Build',
        board_id: defaultBoardId,
        nodes: buildNodes,
        session_id: sessionId,
      }).then(() => {
        // Reload session to get the build state
        loadSession(sessionId);
      }).catch((err) => {
        console.error('Failed to auto-start build:', err);
      }).finally(() => {
        setIsStartingBuild(false);
      });
    }
  }, [sessionId, status, totalCount, devices, settings, isStartingBuild, loadSession]);

  // Auto-select current building node
  useEffect(() => {
    if (currentNode && !selectedNodeId) {
      setSelectedNodeId(currentNode);
    }
  }, [currentNode, selectedNodeId]);

  const nodeList = Object.values(nodes);
  const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null;

  const isRunning = status === 'running';
  const isComplete = ['success', 'partial', 'failed', 'cancelled'].includes(status);
  const canContinue = isComplete && (status === 'success' || status === 'partial');

  const handleContinueToSimulate = () => {
    if (sessionId) {
      navigate(`/simulate/${sessionId}`);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'partial':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'failed':
      case 'cancelled':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return 'Waiting to start...';
      case 'running':
        return 'Building firmware...';
      case 'success':
        return 'Build completed successfully!';
      case 'partial':
        return 'Build completed with some failures';
      case 'failed':
        return 'Build failed';
      case 'cancelled':
        return 'Build cancelled';
      default:
        return status;
    }
  };

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
                onClick={() => navigate(`/design/${sessionId}`)}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Design
              </Button>
              <div className="h-6 w-px bg-gray-700" />
              <div>
                <h1 className="text-xl font-semibold">{projectName}</h1>
                <p className="text-xs text-gray-500">Build Stage</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Only show connection/status when build has started */}
              {totalCount > 0 && (
                <>
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

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    {getStatusIcon()}
                    <span className="text-sm text-gray-300">{getStatusText()}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar - only show when build has started */}
      {totalCount > 0 && (
        <BuildProgress
          completedCount={completedCount}
          totalCount={totalCount}
          status={status}
        />
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Loading State - Waiting for build to start */}
        {totalCount === 0 && status === 'idle' ? (
          <Card className="bg-[#1a1a1a] border-gray-800 h-[calc(100vh-220px)] flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-medium text-white mb-2">Waiting for build to start</h2>
              <p className="text-gray-400">Preparing firmware generation for your nodes...</p>
            </div>
          </Card>
        ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Left Panel - Node List */}
          <div className="col-span-4">
            <Card className="bg-[#1a1a1a] border-gray-800 h-[calc(100vh-220px)] overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <h2 className="text-lg font-medium">Nodes</h2>
                <p className="text-sm text-gray-400">
                  {completedCount}/{totalCount} complete
                </p>
              </div>
              <div className="overflow-y-auto h-[calc(100%-80px)]">
                <NodeList
                  nodes={nodeList}
                  selectedNodeId={selectedNodeId}
                  currentNodeId={currentNode}
                  onSelectNode={setSelectedNodeId}
                />
              </div>
            </Card>
          </div>

          {/* Right Panel - Detail View */}
          <div className="col-span-8">
            <Card className="bg-[#1a1a1a] border-gray-800 h-[calc(100vh-220px)] overflow-hidden">
              {selectedNode ? (
                <DetailPanel
                  node={selectedNode}
                  onRetry={() => retryNode(selectedNode.node_id)}
                  onSkip={() => skipNode(selectedNode.node_id)}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Select a node to view details
                </div>
              )}
            </Card>
          </div>
        </div>
        )}

        {/* Error Display */}
        {error && (
          <Card className="mt-4 p-4 bg-red-900/20 border-red-800">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </Card>
        )}

        {/* Action Buttons - only show when build has started */}
        {totalCount > 0 && (
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={cancelBuild}
            disabled={!isRunning}
            className="border-gray-700 hover:bg-gray-800"
          >
            <Square className="h-4 w-4 mr-2" />
            Cancel Build
          </Button>

          <Button
            onClick={handleContinueToSimulate}
            disabled={!canContinue}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Continue to Simulate
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
        )}
      </div>
    </div>
  );
}
