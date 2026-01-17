import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Play, ChevronUp, ChevronDown, X, MapPin, Hash, FileJson, GripVertical } from "lucide-react";
import LocationSearch from './LocationSearch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const SortableItem = (props) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: props.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center justify-between p-2 bg-muted/50 rounded-md mb-2 text-xs group">
            <div className="flex items-center gap-2">
                <div {...attributes} {...listeners} className="cursor-grab hover:text-primary">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col">
                    <span className="font-mono font-semibold">#{props.item.id}</span>
                    <span className="text-[10px] text-muted-foreground">{props.item.date}</span>
                </div>
                <span className="text-muted-foreground ml-2">
                    {props.item.requirements.capacity}kg
                </span>
            </div>
            <X
                className="h-4 w-4 cursor-pointer hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => props.onRemove(props.item.id)}
            />
        </div>
    );
};

const DispatchForm = ({ onAddDispatch, onBulkAddDispatch, onCalculateRoute, dispatches, pendingDispatches, onRemoveDispatch, onReorderDispatches }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [inputMode, setInputMode] = useState('search'); // 'search' or 'coords'
    const [entryMode, setEntryMode] = useState('manual'); // 'manual' or 'json'
    const [formResetKey, setFormResetKey] = useState(0);
    const [jsonInput, setJsonInput] = useState('');

    const [currentDispatch, setCurrentDispatch] = useState({
        orderNo: '',
        delivery: {
            position: { lat: '', lng: '' } // Store as strings for input
        },
        requirements: {
            cooling: false,
            heating: false,
            capacity: {
                kg: '',
                vol: '' // Not used but kept for structure
            }
        },
        cost: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-GB', { hour12: false }).slice(0, 5)
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCurrentDispatch(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleRequirementChange = (e) => {
        const { name, checked } = e.target;
        setCurrentDispatch(prev => ({
            ...prev,
            requirements: {
                ...prev.requirements,
                [name]: checked
            }
        }));
    };

    const handleCapacityChange = (e) => {
        const { value } = e.target;
        setCurrentDispatch(prev => ({
            ...prev,
            requirements: {
                ...prev.requirements,
                capacity: {
                    ...prev.requirements.capacity,
                    kg: value
                }
            }
        }));
    };

    const handleCostChange = (e) => {
        const { value } = e.target;
        setCurrentDispatch(prev => ({
            ...prev,
            cost: value
        }));
    };

    const handleLocationSelect = (location) => {
        setCurrentDispatch(prev => ({
            ...prev,
            delivery: {
                position: {
                    lat: location.lat,
                    lng: location.lon // Nominatim returns 'lon'
                }
            }
        }));
    };

    const handleCoordChange = (e) => {
        const { name, value } = e.target;
        setCurrentDispatch(prev => ({
            ...prev,
            delivery: {
                position: {
                    ...prev.delivery.position,
                    [name]: value
                }
            }
        }));
    };

    const createPayload = () => {
        // Validate
        if (!currentDispatch.orderNo || !currentDispatch.requirements.capacity.kg) {
            alert("Please fill in ID and Weight");
            return null;
        }
        if (!currentDispatch.delivery.position.lat || !currentDispatch.delivery.position.lng) {
            alert("Please select a location or enter coordinates");
            return null;
        }

        // Check for duplicate ID
        if (pendingDispatches.some(d => d.id === currentDispatch.orderNo)) {
            alert(`Order ID "${currentDispatch.orderNo}" already exists in the pending list. Please use a unique ID.`);
            return null;
        }

        return {
            id: currentDispatch.orderNo,
            orderNo: currentDispatch.orderNo, // Ensure backend receives orderNo
            date: currentDispatch.date,
            time: currentDispatch.time,
            requirements: {
                capacity: parseFloat(currentDispatch.requirements.capacity.kg) || 0,
                cooling: currentDispatch.requirements.cooling,
                heating: currentDispatch.requirements.heating,
                maxCost: currentDispatch.cost ? parseFloat(currentDispatch.cost) : 0
            },
            delivery: {
                lat: parseFloat(currentDispatch.delivery.position.lat),
                lng: parseFloat(currentDispatch.delivery.position.lng)
            }
        };
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = createPayload();
        if (!payload) return;

        onAddDispatch(payload);
        resetForm();
    };

    const handleFlyNow = () => {
        const payload = createPayload();
        if (!payload) return;

        // Add to state AND calculate immediately with existing + new
        onAddDispatch(payload);
        onCalculateRoute([...pendingDispatches, payload]);
        resetForm();
    };

    const resetForm = () => {
        setCurrentDispatch({
            orderNo: '',
            delivery: { position: { lat: '', lng: '' } },
            requirements: {
                cooling: false,
                heating: false,
                capacity: { kg: '', vol: '' }
            },
            cost: '',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('en-GB', { hour12: false }).slice(0, 5)
        });
        setFormResetKey(prev => prev + 1);
    };

    const handleJsonSubmit = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            if (!Array.isArray(parsed)) {
                alert("Input must be an array of dispatch objects.");
                return;
            }

            // Basic validation and transformation
            const validDispatches = parsed.map(d => ({
                id: d.id,
                date: d.date || new Date().toISOString().split('T')[0],
                time: d.time || new Date().toLocaleTimeString('en-GB', { hour12: false }).slice(0, 5),
                requirements: {
                    // Ensure capacity is a number, handle both direct number and nested object if user pastes old format
                    capacity: typeof d.requirements?.capacity === 'object'
                        ? (d.requirements.capacity.kg || 0)
                        : (d.requirements?.capacity || 0),
                    cooling: d.requirements?.cooling || false,
                    heating: d.requirements?.heating || false,
                    maxCost: d.requirements?.maxCost || 0
                },
                delivery: {
                    // Handle both direct lat/lng and nested position object
                    lat: d.delivery?.lat || d.delivery?.position?.lat || 0,
                    lng: d.delivery?.lng || d.delivery?.position?.lng || 0
                }
            }));

            if (onBulkAddDispatch) {
                onBulkAddDispatch(validDispatches);
                setJsonInput('');
                alert(`Successfully loaded ${validDispatches.length} dispatches.`);
            }
        } catch (e) {
            alert("Invalid JSON format. Please check your input.");
            console.error(e);
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = pendingDispatches.findIndex((d) => d.id === active.id);
            const newIndex = pendingDispatches.findIndex((d) => d.id === over.id);
            if (onReorderDispatches) {
                onReorderDispatches(arrayMove(pendingDispatches, oldIndex, newIndex));
            }
        }
    };

    return (
        <Card className="absolute bottom-4 left-4 w-80 z-[1000] shadow-xl bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-border/50">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    Flight Control
                    {pendingDispatches.length > 0 && (
                        <Badge variant="secondary" className="text-xs h-5 px-1.5">
                            {pendingDispatches.length} Pending
                        </Badge>
                    )}
                </CardTitle>
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
            </CardHeader>

            {isExpanded && (
                <CardContent className="p-4 pt-0 space-y-4">
                    <Tabs value={entryMode} onValueChange={setEntryMode} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="manual" className="text-xs">Manual Entry</TabsTrigger>
                            <TabsTrigger value="json" className="text-xs">JSON Load</TabsTrigger>
                        </TabsList>

                        <TabsContent value="manual" className="space-y-4 mt-0">
                            {/* Compact Input Grid */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                    <Label htmlFor="orderNo" className="text-[10px] uppercase text-muted-foreground">ID</Label>
                                    <Input
                                        id="orderNo"
                                        name="orderNo"
                                        placeholder="#"
                                        value={currentDispatch.orderNo}
                                        onChange={handleInputChange}
                                        className="h-8 text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="capacity" className="text-[10px] uppercase text-muted-foreground">Weight (kg)</Label>
                                    <Input
                                        id="capacity"
                                        placeholder="kg"
                                        value={currentDispatch.requirements.capacity.kg}
                                        onChange={handleCapacityChange}
                                        type="number"
                                        className="h-8 text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="cost" className="text-[10px] uppercase text-muted-foreground">Max £</Label>
                                    <Input
                                        id="cost"
                                        name="cost"
                                        placeholder="Opt"
                                        value={currentDispatch.cost}
                                        onChange={handleCostChange}
                                        type="number"
                                        className="h-8 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Location Input Section */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Delivery Location</Label>
                                    <Tabs value={inputMode} onValueChange={setInputMode} className="w-[120px]">
                                        <TabsList className="grid w-full grid-cols-2 h-6 p-0.5">
                                            <TabsTrigger value="search" className="text-[10px] h-5 px-1"><MapPin className="h-3 w-3" /></TabsTrigger>
                                            <TabsTrigger value="coords" className="text-[10px] h-5 px-1"><Hash className="h-3 w-3" /></TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </div>

                                {inputMode === 'search' ? (
                                    <LocationSearch key={formResetKey} onLocationSelect={handleLocationSelect} />
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            name="lat"
                                            placeholder="Lat: 55.944"
                                            value={currentDispatch.delivery.position.lat}
                                            onChange={handleCoordChange}
                                            className="h-8 text-xs"
                                            type="number"
                                        />
                                        <Input
                                            name="lng"
                                            placeholder="Lng: -3.188"
                                            value={currentDispatch.delivery.position.lng}
                                            onChange={handleCoordChange}
                                            className="h-8 text-xs"
                                            type="number"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Requirements */}
                            <div className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="cooling"
                                        name="cooling"
                                        checked={currentDispatch.requirements.cooling}
                                        onCheckedChange={(checked) => handleRequirementChange({ target: { name: 'cooling', checked } })}
                                    />
                                    <Label htmlFor="cooling" className="text-xs font-normal">Cooling</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="heating"
                                        name="heating"
                                        checked={currentDispatch.requirements.heating}
                                        onCheckedChange={(checked) => handleRequirementChange({ target: { name: 'heating', checked } })}
                                    />
                                    <Label htmlFor="heating" className="text-xs font-normal">Heating</Label>
                                </div>
                            </div>

                            {/* Order Date & Time */}
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground">Order Date & Time</Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            type="date"
                                            name="date"
                                            className="h-7 text-[10px] px-2 w-full"
                                            value={currentDispatch.date}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="relative flex-1">
                                        <Input
                                            type="time"
                                            name="time"
                                            className="h-7 text-[10px] px-2 w-full"
                                            value={currentDispatch.time}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Button onClick={handleSubmit} className="flex-1 h-8 text-xs" variant="secondary">
                                    <Plus className="mr-2 h-3 w-3" /> Add
                                </Button>
                                <Button onClick={handleFlyNow} className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                                    <Play className="mr-2 h-3 w-3" /> Fly Current Order
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="json" className="space-y-4 mt-0">
                            <div className="space-y-2">
                                <Label htmlFor="jsonInput" className="text-xs text-muted-foreground">Paste JSON Array</Label>
                                <Textarea
                                    id="jsonInput"
                                    placeholder='[{"id": "1", ...}]'
                                    className="h-[200px] text-xs font-mono"
                                    value={jsonInput}
                                    onChange={(e) => setJsonInput(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleJsonSubmit} className="w-full h-8 text-xs" variant="secondary">
                                <FileJson className="mr-2 h-3 w-3" /> Load JSON
                            </Button>
                        </TabsContent>
                    </Tabs>


                    {/* Pending List (Sortable) */}
                    {pendingDispatches.length > 0 && (
                        <ScrollArea className="h-[150px] w-full rounded-md border p-2">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={pendingDispatches.map(d => d.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {pendingDispatches.length === 0 ? (
                                        <div className="text-center text-xs text-muted-foreground py-4">
                                            No pending orders.
                                        </div>
                                    ) : (
                                        pendingDispatches.map((dispatch, index) => (
                                            <SortableItem
                                                key={dispatch.id}
                                                id={dispatch.id}
                                                item={dispatch}
                                                index={index}
                                                onRemove={onRemoveDispatch}
                                            />
                                        ))
                                    )}
                                </SortableContext>
                            </DndContext>
                        </ScrollArea>
                    )}

                    <Button
                        onClick={() => onCalculateRoute(pendingDispatches)}
                        className="w-full h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={pendingDispatches.length === 0}
                    >
                        <Play className="mr-2 h-3 w-3" />
                        Calculate Route ({pendingDispatches.length})
                    </Button>
                </CardContent>
            )}
        </Card>
    );
};

export default DispatchForm;
