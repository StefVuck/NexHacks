import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { DevicePalette } from './DevicePalette';
import type { DevicePaletteItem } from '../../types/design';

interface DevicePickerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDeviceSelect: (device: DevicePaletteItem) => void;
}

export const DevicePickerModal: React.FC<DevicePickerModalProps> = ({
    open,
    onOpenChange,
    onDeviceSelect,
}) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col bg-[#121212] border-white/10 text-white p-0 gap-0">
                <DialogHeader className="p-6 border-b border-white/10">
                    <DialogTitle className="text-xl font-bold">Select Device</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden p-6">
                    <DevicePalette
                        onDeviceSelect={onDeviceSelect}
                        className="h-full"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};
