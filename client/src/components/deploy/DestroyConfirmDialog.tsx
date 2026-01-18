import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DestroyConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  swarmName: string;
  onConfirm: () => void;
}

export function DestroyConfirmDialog({
  open,
  onOpenChange,
  swarmName,
  onConfirm,
}: DestroyConfirmDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const isConfirmed = confirmText === swarmName;

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
      setConfirmText('');
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setConfirmText('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-[#0a0a0a] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Destroy Infrastructure
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            This action cannot be undone. This will permanently destroy all cloud resources
            including the EC2 instance, Elastic IP, and security groups.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
            <p className="text-sm text-red-400">
              All data on the server will be lost. Make sure to download any important
              logs or data before proceeding.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm" className="text-sm text-gray-300">
              Type <span className="font-mono text-white">{swarmName}</span> to confirm
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={swarmName}
              className="bg-black/50 border-white/10 text-white font-mono"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-white/10">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="text-gray-300"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmed}
            className="bg-red-600 hover:bg-red-500"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Destroy Infrastructure
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
