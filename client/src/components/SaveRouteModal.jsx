import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

const SaveRouteModal = ({ isOpen, onClose, onSave, defaultName }) => {
    const [name, setName] = useState(defaultName || '');

    const handleSave = () => {
        if (name.trim()) {
            onSave(name);
            onClose();
        }
    };

    // Reset name when modal opens
    useEffect(() => {
        if (isOpen) {
            setName(defaultName || '');
        }
    }, [isOpen, defaultName]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-background border border-border rounded-lg shadow-lg p-6 space-y-4 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Save Route</h2>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="grid gap-4 py-2">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                            placeholder="e.g., Cooling Only Test"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave();
                            }}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save Route</Button>
                </div>
            </div>
        </div>
    );
};

export default SaveRouteModal;
