import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { generateGeoJson, downloadGeoJson } from '../lib/geoJsonUtils';
import CostBreakdown from './CostBreakdown';
import { Plane, CheckCircle2, Circle, XCircle, RotateCcw, Download, Save } from "lucide-react";

const DeliveryProgressPanel = ({ flightPath, deliveryStatuses, onCancel, onNewRoute, restrictedAreas, servicePoints, drones, previousFlightPath, isComparisonMode, onToggleComparison, onSave }) => {
    if (!flightPath || !flightPath.dronePaths) return null;

    const handleDownload = () => {
        const geoJson = generateGeoJson(flightPath, restrictedAreas, servicePoints);
        const filename = `flight-path-${new Date().toISOString().replace(/[:.]/g, '-')}.geojson`;
        downloadGeoJson(geoJson, filename);
    };

    const isFlightComplete = flightPath.dronePaths.every(dp =>
        dp.deliveries.every(d => deliveryStatuses[d.deliveryId] === 'completed')
    );

    return (
        <Card className="w-full shadow-xl bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-border/50">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className={`text-sm font-medium flex items-center gap-2 ${isFlightComplete ? 'text-green-500' : 'text-blue-500'}`}>
                    {isFlightComplete ? (
                        <CheckCircle2 className="h-4 w-4" />
                    ) : (
                        <Plane className="h-4 w-4 animate-pulse" />
                    )}
                    {(() => {
                        const isDelivering = flightPath.dronePaths.some(dp =>
                            dp.deliveries.some(d => deliveryStatuses[d.deliveryId] === 'delivering')
                        );
                        if (isFlightComplete) return 'Order Completed';
                        if (isDelivering) return 'Delivery Completed';
                        return 'Flight in Progress';
                    })()}
                </CardTitle>
                <div className="relative group">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDownload}>
                        <Download className="h-4 w-4" />
                    </Button>
                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-popover text-popover-foreground text-xs px-2 py-1 rounded-md border shadow-md whitespace-nowrap z-50">
                        Export Flight Path as GeoJSON
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-4">
                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-muted/50 p-2 rounded-md text-center">
                        <div className="text-[10px] text-muted-foreground uppercase">Cost</div>
                        <div className="text-sm font-bold text-green-400">
                            {(() => {
                                const calculateTotal = (fp) => {
                                    if (!fp || !fp.dronePaths) return 0;
                                    return fp.dronePaths.reduce((acc, dp) => {
                                        const drone = drones.find(d => d.id === dp.droneId) || {};
                                        const cap = drone.capability || {};
                                        const moves = dp.totalMoves || dp.deliveries.reduce((a, d) => a + d.flightPath.length, 0);
                                        return acc + (cap.costInitial || 0) + (moves * (cap.costPerMove || 0)) + (cap.costFinal || 0);
                                    }, 0);
                                };
                                return calculateTotal(flightPath).toFixed(2);
                            })()}
                        </div>
                    </div>
                    <div className="bg-muted/50 p-2 rounded-md text-center">
                        <div className="text-[10px] text-muted-foreground uppercase">Moves</div>
                        <div className="text-sm font-bold text-blue-400">{flightPath.totalMoves || 0}</div>
                    </div>
                    <div className="bg-muted/50 p-2 rounded-md text-center">
                        <div className="text-[10px] text-muted-foreground uppercase">Drones</div>
                        <div className="text-sm font-bold text-purple-400">{flightPath.dronePaths.length}</div>
                    </div>
                </div>

                {/* Cost Breakdown */}
                <CostBreakdown flightPath={flightPath} drones={drones} />



                <ScrollArea className="h-[240px] pr-4">
                    <div className="space-y-6 pb-4">
                        {flightPath.dronePaths.map((dronePath, index) => (
                            <div key={dronePath.droneId} className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: dronePath.color || '#3b82f6' }} // Fallback color
                                    />
                                    Drone {dronePath.droneId}
                                </div>

                                <div className="space-y-2 pl-3 border-l border-border/50 ml-1">
                                    {dronePath.deliveries.map((delivery, dIndex) => {
                                        const status = deliveryStatuses[delivery.deliveryId] || 'pending';

                                        return (
                                            <div key={dIndex} className="flex items-start gap-3 text-sm">
                                                {status === 'completed' ? (
                                                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                                ) : status === 'in-progress' ? (
                                                    <div className="relative mt-0.5 shrink-0">
                                                        <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                                                        <Circle className="h-4 w-4 text-blue-500 relative z-10 fill-blue-500/20" />
                                                    </div>
                                                ) : (
                                                    <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                                )}

                                                <div className="flex flex-col">
                                                    <span className={status === 'completed' ? 'text-muted-foreground line-through' : ''}>
                                                        {delivery.deliveryId ? `Delivery #${delivery.deliveryId}` : 'Return to Base'}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {/* We might need to pass location name if available, otherwise coords */}
                                                        Lat: {delivery.flightPath[delivery.flightPath.length - 1].lat.toFixed(4)},
                                                        Lng: {delivery.flightPath[delivery.flightPath.length - 1].lng.toFixed(4)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <div className="flex gap-2 pt-4 pb-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={onCancel}>
                        <XCircle className="mr-2 h-3 w-3" /> Cancel
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={onSave}>
                        <Save className="mr-2 h-3 w-3" /> Save
                    </Button>
                    <Button size="sm" className="flex-1 text-xs bg-green-600 hover:bg-green-700 text-white h-8" onClick={onNewRoute}>
                        <RotateCcw className="mr-2 h-3 w-3" /> New Route
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default DeliveryProgressPanel;
