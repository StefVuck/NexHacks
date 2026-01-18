import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDesignStore } from '../stores/designStore';
import { useDesign, useAutoSave, useDesignKeyboard } from '../hooks/useDesign';
import { AppHeader } from '../components/layout';
import { DesignCanvas } from '../components/design/DesignCanvas';
import { DeviceConfigPanel } from '../components/design/DeviceConfigPanel';
import { CanvasControls } from '../components/design/CanvasControls';
import { SelectionToolbar } from '../components/design/SelectionToolbar';
import { SettingsModal } from '../components/settings/SettingsModal';
import { DevicePickerModal } from '../components/design/DevicePickerModal';
import { Button } from '../components/ui/button';
import { ArrowRight, Loader2, Plus } from 'lucide-react';

const generateUUID = () => Math.random().toString(36).substr(2, 9);

export const DesignPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Store state
  const mode = useDesignStore((state) => state.mode);
  const devices = useDesignStore((state) => state.devices);
  const selectedDeviceIds = useDesignStore((state) => state.selection.selectedDeviceIds);
  const isLoading = useDesignStore((state) => state.isLoading);
  const settingsModalOpen = useDesignStore((state) => state.settingsModalOpen);
  const closeSettingsModal = useDesignStore((state) => state.closeSettingsModal);
  const setProjectId = useDesignStore((state) => state.setProjectId);
  const completeStage = useDesignStore((state) => state.completeStage);

  // Hooks
  const { proceedToBuild } = useDesign(id);
  useAutoSave();
  useDesignKeyboard();

  // Initialize project ID
  useEffect(() => {
    if (id) {
      setProjectId(id);
    } else {
      // Generate new ID for new projects
      const newId = `design-${Date.now()}`;
      setProjectId(newId);
      navigate(`/design/${newId}`, { replace: true });
    }
  }, [id, setProjectId, navigate]);

  // Modal state
  const [devicePickerOpen, setDevicePickerOpen] = React.useState(false);
  const addDevice = useDesignStore((state) => state.addDevice);

  // Handle proceed to build
  const handleProceedToBuild = async () => {
    try {
      const sessionId = await proceedToBuild();
      if (sessionId) {
        completeStage('design');
        navigate(`/build/${sessionId}`);
        console.log('Ready to navigate to build stage:', sessionId);
      }
    } catch (e) {
      console.error("Failed to start build:", e);
      // Optional: show toast error
    }
  };

  const canvasView = useDesignStore((state) => state.canvasView);

  const handleDeviceSelect = (deviceItem: any) => {
    // Add device to center of map (which is stored in canvasView.center as {x: lng, y: lat})
    const position = {
      x: canvasView.center.x || -79.9428,
      y: canvasView.center.y || 40.4432
    };

    const newDeviceId = addDevice({
      boardType: deviceItem.boardType,
      nodeId: `${deviceItem.boardType}_${generateUUID()}`,
      name: deviceItem.name,
      description: deviceItem.description,
      position: position,
      features: deviceItem.defaultFeatures.map((f: any) => ({ ...f, id: generateUUID() })),
      assertions: [],
    });

    // Auto-connect to the last added device (if any) for "laser chain" effect
    // Grab existing devices BEFORE addDevice changed the list (state is updated async or we need fresh ref)
    // Actually we need the list *excluding* the new one to find the 'previous' one.
    // Since we just added it, if we get state it might include it or not depending on zustand batching.
    // Safest is to rely on what we had.

    // We already have 'existingDevices' from the store
    // Since addDevice updated the store, the new device is the last one.
    // We want the ONE BEFORE that.
    const devices = useDesignStore.getState().devices;

    if (devices.length >= 2) {
      const previousDevice = devices[devices.length - 2];

      useDesignStore.getState().addConnection({
        fromDeviceId: previousDevice.id,
        toDeviceId: newDeviceId,
        protocol: 'mqtt', // Default protocol
        label: 'LASER_LINK'
      });
    }

    setDevicePickerOpen(false);
  };

  const selectedDevice = devices.find((d) => selectedDeviceIds[0] === d.id);
  const hasDevices = devices.length > 0;

  return (
    <div className="h-screen w-full flex flex-col bg-[#0a0a0a] text-white overflow-hidden">
      {/* Header */}
      <AppHeader />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar: REMOVED, replaced by floating button */}

        {/* Floating Add Device Button */}
        <div className="absolute top-4 left-4 z-20">
          <Button
            onClick={() => setDevicePickerOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Device
          </Button>
        </div>

        <DevicePickerModal
          open={devicePickerOpen}
          onOpenChange={setDevicePickerOpen}
          onDeviceSelect={handleDeviceSelect}
        />

        {/* Center: Canvas */}
        <main className="flex-1 relative">
          <DesignCanvas />

          {/* Canvas controls overlay */}
          <div className="absolute top-4 right-4 z-10">
            <CanvasControls />
          </div>

          {/* Selection toolbar overlay */}
          {selectedDeviceIds.length > 0 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
              <SelectionToolbar />
            </div>
          )}

          {/* Empty state */}
          {!hasDevices && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-400 mb-2">
                  No devices yet
                </h3>
                <p className="text-sm text-gray-600">
                  {mode === 'ai'
                    ? 'Describe your system above and generate a layout, or drag devices from the palette.'
                    : 'Drag devices from the left palette to start building your swarm.'}
                </p>
              </div>
            </div>
          )}
        </main>

        {/* Right sidebar: Device config */}
        <aside className="w-80 bg-[#121212] border-l border-white/10 flex flex-col">
          {selectedDevice ? (
            <DeviceConfigPanel device={selectedDevice} />
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                    />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">
                  Select a device to configure
                </p>
              </div>
            </div>
          )}

          {/* Proceed button */}
          <div className="p-4 border-t border-white/10">
            <Button
              onClick={handleProceedToBuild}
              disabled={!hasDevices || isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Proceed to Build
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
            {!hasDevices && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Add at least one device to proceed
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* Settings modal */}
      <SettingsModal open={settingsModalOpen} onClose={closeSettingsModal} />
    </div>
  );
};

export default DesignPage;
