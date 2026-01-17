import React, { useState, useEffect } from 'react';
import { getDrones } from '../services/ilpApi';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp, Battery, Zap, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DronePanel = ({ drones = [] }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Drones are now passed as props




    return (
        <Card className={cn(
            "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-border/50 shadow-xl transition-all duration-300",
            isOpen ? "h-auto" : "h-auto"
        )}>
            <CardHeader
                className="py-3 px-4 flex flex-row items-center justify-between space-y-0 cursor-pointer border-b border-border/50 hover:bg-accent/50 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center space-x-2">
                    <Plane className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-medium select-none">Fleet Status</CardTitle>
                    <Badge variant="outline" className="ml-2 text-xs">{drones.length} Active</Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
            </CardHeader>

            {isOpen && (
                <CardContent className="p-0">
                    <ScrollArea className="h-[200px] w-full">
                        <div className="p-4 space-y-3">
                            {drones.map((drone, index) => (
                                <div key={index} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-sm">{drone.name}</span>
                                        <div className="flex gap-1">
                                            {drone.capability.cooling && <Badge variant="secondary" className="text-[10px] px-1 h-4 bg-blue-500/20 text-blue-400">Cooling</Badge>}
                                            {drone.capability.heating && <Badge variant="secondary" className="text-[10px] px-1 h-4 bg-red-500/20 text-red-400">Heating</Badge>}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                                        <div className="flex items-center"><Battery className="h-3 w-3 mr-1" /> {drone.capability.maxMoves} moves</div>
                                        <div className="flex items-center"><Zap className="h-3 w-3 mr-1" /> £{drone.capability.costPerMove}/mv</div>
                                        <div className="flex items-center col-span-2">Cap: {drone.capability.capacity}kg</div>
                                    </div>
                                    {index < drones.length - 1 && <Separator className="my-2" />}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            )
            }
        </Card >
    );
};

export default DronePanel;
