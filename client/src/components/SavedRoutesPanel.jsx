import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Eye, Scale, Clock, X, MapPin, Plane, ChevronDown, ChevronUp, CheckCircle2, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import CostBreakdown from './CostBreakdown';

const SavedRoutesPanel = ({ isOpen, onClose, savedRoutes, onView, onCompare, onDelete, currentRouteId, comparisonRouteId, currentFlightPath, drones }) => {
    const [expandedRouteId, setExpandedRouteId] = useState(null);
    const [isSelectingForCompare, setIsSelectingForCompare] = useState(false);
    const [selectedForCompare, setSelectedForCompare] = useState([]);

    if (!isOpen) return null;

    const toggleExpand = (id) => {
        setExpandedRouteId(expandedRouteId === id ? null : id);
    };

    const toggleSelection = (route) => {
        if (selectedForCompare.find(r => r.id === route.id)) {
            setSelectedForCompare(prev => prev.filter(r => r.id !== route.id));
        } else {
            if (selectedForCompare.length < 2) {
                setSelectedForCompare(prev => [...prev, route]);
            }
        }
    };

    const startComparison = () => {
        setIsSelectingForCompare(true);
        setSelectedForCompare([]);
    };

    const cancelComparison = () => {
        setIsSelectingForCompare(false);
        setSelectedForCompare([]);
    };

    // Prepare "Current Route" as a selectable item if it exists
    // Only show "Current Route" if it's NOT already in the saved list (deduplication)
    // We check if any saved route has the same timestamp or ID as the current one (if current has an ID)
    // Since currentFlightPath doesn't have a persistent ID until saved, we can check if `currentRouteId` is null.
    // If `currentRouteId` is NOT null, it means we are viewing a saved route, so "Current Route" is redundant.
    const showCurrentRoute = currentFlightPath && !currentRouteId;

    const currentRouteItem = showCurrentRoute ? {
        id: 'current-session-route',
        name: 'Current Route (Unsaved)',
        result: currentFlightPath,
        timestamp: new Date().toISOString(),
        isCurrent: true
    } : null;

    // Combine for selection list
    const allRoutes = currentRouteItem ? [currentRouteItem, ...savedRoutes] : savedRoutes;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-background/50 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="w-full max-w-4xl bg-background/95 border-border shadow-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
                <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        {isSelectingForCompare ? (
                            <>
                                <Button variant="ghost" size="icon" onClick={cancelComparison}>
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                Compare Routes ({selectedForCompare.length}/2)
                            </>
                        ) : (
                            <>
                                <MapPin className="h-5 w-5 text-blue-500" />
                                Saved Routes ({savedRoutes?.length || 0})
                            </>
                        )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {!isSelectingForCompare && (
                            <Button variant="outline" size="sm" onClick={startComparison} disabled={allRoutes.length < 2}>
                                <Scale className="h-4 w-4 mr-2" />
                                Compare Routes
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </CardHeader>

                <ScrollArea className="flex-1 p-4">
                    {/* Comparison View (Side by Side) */}
                    {isSelectingForCompare && selectedForCompare.length === 2 ? (
                        <div className="grid grid-cols-2 gap-4 h-full">
                            {selectedForCompare.map((route, idx) => (
                                <Card key={route.id} className="border-border bg-card overflow-hidden flex flex-col">
                                    <CardHeader className="p-3 bg-muted/30 border-b border-border">
                                        <CardTitle className="text-md font-bold flex items-center justify-between">
                                            {route.name}
                                            {route.isCurrent && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Active</span>}
                                        </CardTitle>
                                        <div className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(route.timestamp), { addSuffix: true })}
                                        </div>
                                    </CardHeader>
                                    <ScrollArea className="flex-1 p-3">
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div className="bg-muted/20 p-2 rounded">
                                                    <div className="text-[10px] uppercase text-muted-foreground">Cost</div>
                                                    <div className="font-bold text-green-500">£{route.result.totalCost?.toFixed(2)}</div>
                                                </div>
                                                <div className="bg-muted/20 p-2 rounded">
                                                    <div className="text-[10px] uppercase text-muted-foreground">Moves</div>
                                                    <div className="font-bold text-blue-500">{route.result.totalMoves}</div>
                                                </div>
                                                <div className="bg-muted/20 p-2 rounded">
                                                    <div className="text-[10px] uppercase text-muted-foreground">Drones</div>
                                                    <div className="font-bold text-purple-500">{route.result.dronePaths.length}</div>
                                                </div>
                                            </div>
                                            <CostBreakdown flightPath={route.result} drones={drones} defaultExpanded={true} largeText={true} />
                                        </div>
                                    </ScrollArea>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        /* List View (Selection or Normal) */
                        (!allRoutes || allRoutes.length === 0) ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Plane className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>No routes available.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {allRoutes.map((route) => {
                                    const isSelected = selectedForCompare.find(r => r.id === route.id);
                                    const isExpanded = expandedRouteId === route.id;

                                    // Check if this saved route is the one currently being viewed (if we are viewing a saved route)
                                    const isViewingThisSavedRoute = currentRouteId === route.id;

                                    return (
                                        <div
                                            key={route.id}
                                            className={`
                                                p-4 rounded-xl border transition-all 
                                                ${isSelected ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500' : 'border-border bg-card hover:shadow-md'}
                                                ${isSelectingForCompare ? 'cursor-pointer' : ''}
                                            `}
                                            onClick={() => isSelectingForCompare && toggleSelection(route)}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-start gap-3">
                                                    {isSelectingForCompare && (
                                                        <div className={`mt-1 h-5 w-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-muted-foreground'}`}>
                                                            {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <h3 className="font-bold text-lg flex items-center gap-2">
                                                            {route.name}
                                                            {(route.isCurrent || isViewingThisSavedRoute) && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Current</span>}
                                                        </h3>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                            <Clock className="h-3 w-3" />
                                                            {formatDistanceToNow(new Date(route.timestamp), { addSuffix: true })}
                                                        </div>
                                                    </div>
                                                </div>

                                                {!isSelectingForCompare && (
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => { e.stopPropagation(); toggleExpand(route.id); }}
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                        </Button>
                                                        {!route.isCurrent && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                onClick={(e) => { e.stopPropagation(); onDelete(route.id); }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-3 gap-4 mb-4 bg-muted/30 p-3 rounded-lg">
                                                <div className="text-center">
                                                    <div className="text-[10px] uppercase text-muted-foreground font-semibold">Total Cost</div>
                                                    <div className="text-lg font-bold text-green-500">£{route.result.totalCost?.toFixed(2) || '0.00'}</div>
                                                </div>
                                                <div className="text-center border-l border-border/50">
                                                    <div className="text-[10px] uppercase text-muted-foreground font-semibold">Moves</div>
                                                    <div className="text-lg font-bold">{route.result.totalMoves || 0}</div>
                                                </div>
                                                <div className="text-center border-l border-border/50">
                                                    <div className="text-[10px] uppercase text-muted-foreground font-semibold">Drones</div>
                                                    <div className="text-lg font-bold">{route.result.dronePaths.length}</div>
                                                </div>
                                            </div>

                                            {/* Expanded Details */}
                                            {isExpanded && (
                                                <div className="mt-4 pt-4 border-t border-border/50 animate-in slide-in-from-top-2">
                                                    <CostBreakdown flightPath={route.result} drones={drones} defaultExpanded={true} largeText={true} />
                                                </div>
                                            )}

                                            {/* Actions (Only in normal mode) */}
                                            {!isSelectingForCompare && (
                                                <div className="flex gap-3 mt-3">
                                                    <Button
                                                        variant={currentRouteId === route.id ? "secondary" : "outline"}
                                                        className="flex-1"
                                                        onClick={(e) => { e.stopPropagation(); onView(route); }}
                                                        disabled={currentRouteId === route.id || route.isCurrent}
                                                    >
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        {currentRouteId === route.id || route.isCurrent ? "Currently Viewing" : "View on Map"}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}
                </ScrollArea>
            </Card>
        </div>
    );
};

export default SavedRoutesPanel;
