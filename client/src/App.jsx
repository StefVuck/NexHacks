import React, { useState } from 'react';
import Map from './components/Map';
import DispatchForm from './components/DispatchForm';
import DronePanel from './components/DronePanel';
import DeliveryProgressPanel from './components/DeliveryProgressPanel';
import SaveRouteModal from './components/SaveRouteModal';
import SavedRoutesPanel from './components/SavedRoutesPanel';
import { calcDeliveryPath as calculateRoute } from './services/cw2Api';
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Layers, Loader2, AlertCircle, Moon, Sun, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { getServicePoints, getRestrictedAreas, getDrones } from './services/ilpApi';


function App() {
  const [dispatches, setDispatches] = useState([]);
  const [flightPath, setFlightPath] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [showServicePoints, setShowServicePoints] = useState(true);
  const [showNoFlyZones, setShowNoFlyZones] = useState(true);
  const [isRouteCalculated, setIsRouteCalculated] = useState(false);
  const [deliveryStatuses, setDeliveryStatuses] = useState({}); // { orderNo: 'pending' | 'in-progress' | 'completed' }
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [theme, setTheme] = useState('dark');

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  // Initialize theme on mount
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, []);

  const [previousFlightPath, setPreviousFlightPath] = useState(null);

  const handleAddDispatch = (dispatch) => {
    setDispatches(prev => [...prev, dispatch]);
  };

  const handleBulkAddDispatch = (newDispatches) => {
    setDispatches(prev => [...prev, ...newDispatches]);
  };

  const handleRemoveDispatch = (id) => {
    setDispatches(prev => prev.filter(d => d.id !== id));
  };

  const handleReorderDispatches = (newDispatches) => {
    setDispatches(newDispatches);
  };

  // Session-Based Route Storage
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSavedRoutesOpen, setIsSavedRoutesOpen] = useState(false);
  const [currentRouteId, setCurrentRouteId] = useState(null);
  const [comparisonRouteId, setComparisonRouteId] = useState(null);

  const handleSaveRoute = (name) => {
    const newRoute = {
      id: `route-${Date.now()}`,
      name,
      timestamp: new Date().toISOString(),
      dispatches: [...dispatches],
      result: flightPath
    };
    setSavedRoutes(prev => [newRoute, ...prev]);
    setCurrentRouteId(newRoute.id);
  };

  const handleDeleteRoute = (id) => {
    setSavedRoutes(prev => prev.filter(r => r.id !== id));
    if (currentRouteId === id) setCurrentRouteId(null);
    if (comparisonRouteId === id) {
      setComparisonRouteId(null);
      setIsComparisonMode(false);
      setPreviousFlightPath(null);
    }
  };

  const handleViewRoute = (route) => {
    setFlightPath(route.result);
    setDispatches(route.dispatches);
    setIsRouteCalculated(true);
    setCurrentRouteId(route.id);
    // If we are viewing a saved route, we might want to clear the "previous" path if it's not the comparison one
    // But let's keep it simple.
  };

  const handleCompareRoute = (route) => {
    if (comparisonRouteId === route.id) {
      // Deselect
      setComparisonRouteId(null);
      setIsComparisonMode(false);
      setPreviousFlightPath(null);
    } else {
      setPreviousFlightPath(route.result);
      setComparisonRouteId(route.id);
      setIsComparisonMode(true);
    }
  };

  const [restrictedAreas, setRestrictedAreas] = useState([]);
  const [servicePoints, setServicePoints] = useState([]);
  const [drones, setDrones] = useState([]);

  // Fetch data on mount
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [areas, points, droneList] = await Promise.all([
          getRestrictedAreas(),
          getServicePoints(),
          getDrones()
        ]);
        setRestrictedAreas(areas);
        setServicePoints(points);
        setDrones(droneList);
      } catch (e) {
        console.error("Failed to fetch map data", e);
      }
    };
    fetchData();
  }, []);

  const handleCalculateRoute = async (dispatchesOverride) => {
    setLoading(true);
    setError(null);
    setValidationError(null);
    setWarning(null);

    // Use override if provided, otherwise use state
    const dispatchesToUse = Array.isArray(dispatchesOverride) ? dispatchesOverride : dispatches;

    try {
      const pathData = await calculateRoute(dispatchesToUse);

      if (!pathData || !pathData.dronePaths || pathData.dronePaths.length === 0) {
        throw new Error("No available drones could fulfill these orders. Check constraints or availability.");
      }

      // Store previous path for comparison if it exists
      if (flightPath) {
        setPreviousFlightPath(flightPath);
      }

      setFlightPath(pathData);
      setIsRouteCalculated(true);



      // Check for unfulfilled orders
      const fulfilledIds = new Set();
      pathData.dronePaths.forEach(dp => {
        dp.deliveries.forEach(d => fulfilledIds.add(d.orderNo || d.deliveryId));
      });

      const unfulfilled = dispatchesToUse.filter(d => !fulfilledIds.has(d.id));
      if (unfulfilled.length > 0) {
        setWarning(`${unfulfilled.length} order(s) could not be fulfilled (likely due to drone capacity or constraints).`);
      }

      // Initialize statuses
      const initialStatuses = {};
      dispatchesToUse.forEach(d => {
        initialStatuses[d.id] = 'pending';
      });
      setDeliveryStatuses(initialStatuses);

    } catch (err) {
      setError(err.message || "Failed to calculate route. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRoute = () => {
    setIsRouteCalculated(false);
    // Don't clear flightPath immediately if we want to keep it for comparison?
    // Actually, the requirement says "After a path is calculated... When user reorders and recalculates".
    // So if they cancel, they go back to the form. `flightPath` is set to null in `handleCancelRoute` usually.
    // But I need to keep `previousFlightPath` or `flightPath` somewhere to compare.
    // If I set `flightPath` to null, I lose the current result.
    // But `handleCalculateRoute` logic above sets `previousFlightPath` to `flightPath` before overwriting.
    // So if I cancel, `flightPath` becomes null. Then next calc, `previousFlightPath` will be null.
    // I should NOT clear `flightPath` completely or I should store it in `previousFlightPath` when cancelling?
    // Let's store it in `previousFlightPath` when cancelling so we can compare the NEXT run against this one.
    if (flightPath) {
      setPreviousFlightPath(flightPath);
    }
    setFlightPath(null);
    setDeliveryStatuses({});
  };

  const handleNewRoute = () => {
    setIsRouteCalculated(false);
    setFlightPath(null);
    setPreviousFlightPath(null); // Clear history on full reset
    setDispatches([]);
    setDeliveryStatuses({});
  };

  const handleDeliveryStatusUpdate = React.useCallback((orderNo, status) => {
    setDeliveryStatuses(prev => {
      // Only update if status changed to avoid unnecessary re-renders
      if (prev[orderNo] === status) return prev;
      return {
        ...prev,
        [orderNo]: status
      };
    });
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background text-foreground font-sans transition-colors duration-300">
      {/* Full Screen Map */}
      <div className="absolute inset-0 z-0">
        <Map
          flightPath={flightPath}
          secondaryFlightPath={isComparisonMode ? previousFlightPath : null}
          showServicePoints={showServicePoints}
          showNoFlyZones={showNoFlyZones}
          onDeliveryStatusUpdate={handleDeliveryStatusUpdate}
          restrictedAreas={restrictedAreas}
          theme={theme}
          deliveryStatuses={deliveryStatuses}
        />
      </div>

      {/* Floating Layer Toggles (Top Right) */}
      <Card className="absolute top-4 right-4 z-10 w-48 bg-background/90 backdrop-blur border-border/50 shadow-lg">
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Layers className="h-4 w-4" /> Map Layers
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="service-points" className="text-xs cursor-pointer">Service Points</Label>
            <Switch
              id="service-points"
              checked={showServicePoints}
              onCheckedChange={setShowServicePoints}
              className="scale-75"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="no-fly-zones" className="text-xs cursor-pointer">No-Fly Zones</Label>
            <Switch
              id="no-fly-zones"
              checked={showNoFlyZones}
              onCheckedChange={setShowNoFlyZones}
              className="scale-75"
            />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <Label onClick={() => setIsSavedRoutesOpen(true)} className="text-xs cursor-pointer flex items-center gap-2 hover:text-blue-400 transition-colors">
              <Save className="h-3 w-3" />
              Saved Routes ({savedRoutes.length})
            </Label>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <Label htmlFor="theme-toggle" className="text-xs cursor-pointer flex items-center gap-2">
              {theme === 'dark' ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
              {theme === 'dark' ? 'Map: Dark Mode' : 'Map: Light Mode'}
            </Label>
            <Switch
              id="theme-toggle"
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
              className="scale-75"
            />
          </div>
        </div>
      </Card>

      {/* Floating Drone Stats Panel (Bottom Right) */}
      <div className="absolute bottom-4 right-4 z-20 w-96 pointer-events-auto">
        <DronePanel drones={drones} />
      </div>

      {/* Floating Dispatch Form OR Progress Panel (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-10 w-[450px] pointer-events-auto max-h-[calc(100vh-100px)] flex flex-col justify-end">
        {!isRouteCalculated ? (
          <DispatchForm
            onAddDispatch={handleAddDispatch}
            onBulkAddDispatch={handleBulkAddDispatch}
            onCalculateRoute={handleCalculateRoute}
            pendingDispatches={dispatches}
            onRemoveDispatch={handleRemoveDispatch}
            onReorderDispatches={handleReorderDispatches}
          />
        ) : (
          <DeliveryProgressPanel
            flightPath={flightPath}
            deliveryStatuses={deliveryStatuses}
            onCancel={handleCancelRoute}
            onNewRoute={handleNewRoute}
            restrictedAreas={restrictedAreas}
            servicePoints={servicePoints}
            drones={drones}
            previousFlightPath={previousFlightPath}
            isComparisonMode={isComparisonMode}
            onToggleComparison={() => setIsComparisonMode(!isComparisonMode)}
            onSave={() => setIsSaveModalOpen(true)}
          />
        )}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
            <span className="text-lg font-medium text-foreground">Calculating Flight Path...</span>
          </div>
        </div>
      )}

      {/* Error Toast/Overlay */}
      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-96">
          <Alert variant="destructive" className="shadow-xl bg-destructive/10 border-destructive/50 backdrop-blur">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <button onClick={() => setError(null)} className="absolute top-2 right-2 text-destructive hover:text-destructive/80">✕</button>
          </Alert>
        </div>
      )}

      {/* Validation Warning */}
      {validationError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-96">
          <Alert className="shadow-xl bg-orange-500/10 border-orange-500/50 backdrop-blur text-orange-500">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Flight Path Violation!</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4 text-xs mt-1">
                {validationError.map((v, i) => (
                  <li key={i}>Drone {v.droneId}: {v.type} in {v.areaName}</li>
                ))}
              </ul>
            </AlertDescription>
            <button onClick={() => setValidationError(null)} className="absolute top-2 right-2 text-orange-500 hover:text-orange-400">✕</button>
          </Alert>
        </div>
      )}

      {/* Unfulfilled Orders Warning */}
      {warning && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 z-50 w-96">
          <Alert className="shadow-xl bg-yellow-500/10 border-yellow-500/50 backdrop-blur text-yellow-500">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>{warning}</AlertDescription>
            <button onClick={() => setWarning(null)} className="absolute top-2 right-2 text-yellow-500 hover:text-yellow-400">✕</button>
          </Alert>
        </div>
      )}

      {/* Saved Routes Panel */}
      <SavedRoutesPanel
        isOpen={isSavedRoutesOpen}
        onClose={() => setIsSavedRoutesOpen(false)}
        savedRoutes={savedRoutes}
        onView={(route) => {
          handleViewRoute(route);
          setIsSavedRoutesOpen(false);
        }}
        onCompare={(route) => {
          handleCompareRoute(route);
          setIsSavedRoutesOpen(false);
        }}
        onDelete={handleDeleteRoute}
        currentRouteId={currentRouteId}
        comparisonRouteId={comparisonRouteId}
        currentFlightPath={flightPath}
        drones={drones}
      />

      {/* Save Route Modal */}
      <SaveRouteModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveRoute}
        defaultName={`Route ${savedRoutes.length + 1}`}
      />
    </div>
  );
}

export default App;
