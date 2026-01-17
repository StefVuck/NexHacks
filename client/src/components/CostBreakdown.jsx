import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Coins } from "lucide-react";

const CostBreakdown = ({ flightPath, drones, defaultExpanded = false, largeText = false }) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    if (!flightPath || !flightPath.dronePaths || !drones) return null;

    // Calculate breakdown for each drone
    const breakdown = flightPath.dronePaths.map(dronePath => {
        const drone = drones.find(d => d.id === dronePath.droneId) || {};
        const capability = drone.capability || {};

        const moves = dronePath.totalMoves || dronePath.deliveries.reduce((acc, d) => acc + d.flightPath.length, 0);
        const initialCost = capability.costInitial || 0;
        const finalCost = capability.costFinal || 0;
        const moveCost = moves * (capability.costPerMove || 0);
        const subtotal = initialCost + moveCost + finalCost;

        return {
            droneId: dronePath.droneId,
            name: drone.name || `Drone ${dronePath.droneId}`,
            moves,
            initialCost,
            finalCost,
            moveCost,
            costPerMove: capability.costPerMove || 0,
            subtotal
        };
    });

    const totalCost = breakdown.reduce((acc, item) => acc + item.subtotal, 0);

    return (
        <div className="border rounded-md bg-muted/30 mb-2">
            <Button
                variant="ghost"
                className={`w-full flex justify-between items-center p-2 h-auto hover:bg-muted/50 ${largeText ? 'text-sm' : 'text-xs'}`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <Coins className="h-3 w-3 text-yellow-500" />
                    <span className="font-medium">Cost Breakdown</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-bold text-green-400">£{totalCost.toFixed(2)}</span>
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </div>
            </Button>

            {isExpanded && (
                <div className={`p-3 space-y-3 border-t border-border/50 ${largeText ? 'text-sm' : 'text-xs'}`}>
                    {breakdown.map(item => (
                        <div key={item.droneId} className="space-y-1">
                            <div className="font-semibold text-muted-foreground">{item.name}:</div>
                            <div className={`pl-2 space-y-0.5 font-mono ${largeText ? 'text-xs' : 'text-[10px]'}`}>
                                <div className="flex justify-between">
                                    <span>├─ Initial Cost:</span>
                                    <span>£{item.initialCost.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>├─ Moves ({item.moves}):</span>
                                    <span>£{item.moveCost.toFixed(2)} <span className="text-muted-foreground">({item.moves} × £{item.costPerMove})</span></span>
                                </div>
                                <div className="flex justify-between border-b border-border/30 pb-0.5">
                                    <span>└─ Final Cost:</span>
                                    <span>£{item.finalCost.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-green-400 pt-0.5">
                                    <span>Subtotal:</span>
                                    <span>£{item.subtotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className={`border-t border-border pt-2 flex justify-between font-bold ${largeText ? 'text-base' : 'text-sm'}`}>
                        <span>TOTAL:</span>
                        <span className="text-green-400">£{totalCost.toFixed(2)}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CostBreakdown;
