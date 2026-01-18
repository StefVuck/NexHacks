import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Settings, Rocket, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CloudInfrastructurePanel,
  HardwareDevicesPanel,
  LiveStatusPanel,
  DeploySettingsModal,
  DestroyConfirmDialog,
} from '@/components/deploy';
import { useDeploy } from '@/hooks/useDeploy';

export default function DeployPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    // State
    sessionId,
    swarmId,
    swarmName,
    devices,
    flashStatus,
    isScanning,
    cloudStatus,
    cloudPrerequisites,
    telemetry,
    settings,
    settingsModalOpen,
    destroyConfirmOpen,

    // Computed
    canDeploy,
    canDestroy,
    isDeploying,
    isDestroying,

    // Actions
    setSession,
    setSettingsModalOpen,
    setDestroyConfirmOpen,
    setSettings,
    scanDevices,
    assignNode,
    flashDevice,
    flashAll,
    startCloudDeploy,
    destroyCloudDeploy,
    saveSettings,
    simulateTelemetry,
  } = useDeploy();

  // Initialize session from URL params
  useEffect(() => {
    if (id && !sessionId) {
      // In a real app, we'd fetch the session/swarm details from the API
      // For now, we'll use the ID as both session and swarm ID
      setSession(id, id, `Swarm ${id.slice(0, 8)}`);
    }
  }, [id, sessionId, setSession]);

  // Mock nodes for testing (in real app, would come from build results)
  const mockNodes = [
    { node_id: 'sensor_1', description: 'Temperature sensor - Zone A' },
    { node_id: 'sensor_2', description: 'Temperature sensor - Zone B' },
    { node_id: 'sensor_3', description: 'Humidity sensor' },
    { node_id: 'aggregator', description: 'Data aggregator node' },
  ];

  const handleDestroy = () => {
    setDestroyConfirmOpen(true);
  };

  const handleConfirmDestroy = async () => {
    await destroyCloudDeploy();
    setDestroyConfirmOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Grid Background */}
      <div
        className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* Vignette */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(10,10,10,0.9)_100%)]" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-purple-400" />
                  Deploy
                </h1>
                <p className="text-sm text-gray-500 font-mono">
                  {swarmName || 'Loading...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={`${
                  cloudStatus.status === 'deployed'
                    ? 'text-emerald-400 border-emerald-400/30'
                    : isDeploying
                    ? 'text-blue-400 border-blue-400/30 animate-pulse'
                    : 'text-gray-400'
                }`}
              >
                {cloudStatus.status === 'deployed'
                  ? 'Live'
                  : isDeploying
                  ? 'Deploying...'
                  : 'Not Deployed'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSettingsModalOpen(true)}
                className="text-gray-300"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Prerequisites Warning */}
        {cloudPrerequisites && !cloudPrerequisites.ready && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3"
          >
            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-400">
                Prerequisites not met for cloud deployment
              </p>
              <ul className="mt-2 text-xs text-yellow-400/70 space-y-1">
                {!cloudPrerequisites.terraform_installed && (
                  <li>Terraform is not installed. Install from terraform.io</li>
                )}
                {!cloudPrerequisites.aws_configured && (
                  <li>
                    AWS credentials not configured. Set AWS_ACCESS_KEY_ID and
                    AWS_SECRET_ACCESS_KEY environment variables
                  </li>
                )}
              </ul>
            </div>
          </motion.div>
        )}

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <CloudInfrastructurePanel
              cloudStatus={cloudStatus}
              canDeploy={canDeploy}
              canDestroy={canDestroy}
              isDeploying={isDeploying}
              isDestroying={isDestroying}
              prerequisitesReady={cloudPrerequisites?.ready ?? false}
              onDeploy={startCloudDeploy}
              onDestroy={handleDestroy}
              onOpenSettings={() => setSettingsModalOpen(true)}
            />

            <HardwareDevicesPanel
              devices={devices}
              flashStatus={flashStatus}
              isScanning={isScanning}
              nodes={mockNodes}
              onScan={scanDevices}
              onAssign={assignNode}
              onFlash={flashDevice}
              onFlashAll={flashAll}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <LiveStatusPanel
              telemetry={telemetry}
              serverOnline={cloudStatus.status === 'deployed'}
              onSimulate={simulateTelemetry}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      <DeploySettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
        settings={settings}
        onSettingsChange={setSettings}
        onSave={saveSettings}
      />

      <DestroyConfirmDialog
        open={destroyConfirmOpen}
        onOpenChange={setDestroyConfirmOpen}
        swarmName={swarmName || 'swarm'}
        onConfirm={handleConfirmDestroy}
      />
    </div>
  );
}
