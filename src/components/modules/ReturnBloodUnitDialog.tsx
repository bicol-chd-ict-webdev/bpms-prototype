import React, { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBloodData } from '../../context/BloodDataContext';
import { BloodUnit } from '../../types/blood';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';

interface ReturnBloodUnitDialogProps {
 unit: BloodUnit | null;
 open: boolean;
 onOpenChange: (open: boolean) => void;
}

export const ReturnBloodUnitDialog: React.FC<ReturnBloodUnitDialogProps> = ({ unit, open, onOpenChange }) => {
 const { user } = useAuth();
 const { returnBloodUnit } = useBloodData();
 const [reason, setReason] = useState('');

 useEffect(() => {
 if (!open) setReason('');
 }, [open]);

 if (!unit?.receivedFrom) return null;

 const origin = unit.receivedFrom;
 const submitReturn = () => {
 if (!user || !reason.trim()) return;
 const returned = returnBloodUnit(unit.id, user.facilityCode, user.facilityName, reason);
 if (returned) onOpenChange(false);
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="min-w-0 overflow-hidden sm:max-w-xl [&>*]:min-w-0">
 <DialogHeader>
 <DialogTitle>Return blood unit</DialogTitle>
 <DialogDescription>
 This unit is locked to its original request source. It cannot be returned to another facility.
 </DialogDescription>
 </DialogHeader>

 <div className="flex min-w-0 flex-col gap-3 text-sm">
 <div className="rounded-md border bg-muted/40 p-3">
 <p className="font-mono font-semibold">{unit.id}</p>
 <p className="mt-1 text-muted-foreground">{unit.bloodType} · {unit.component}</p>
 </div>
 <div className="rounded-md border bg-muted/40 p-3">
 <p className="text-xs font-medium text-muted-foreground">Return destination</p>
 <p className="mt-1 font-semibold">{origin.facilityName}</p>
 <p className="mt-1 text-xs text-muted-foreground">Original request: {origin.requisitionId}</p>
 </div>
 <label htmlFor="return-reason" className="flex w-full min-w-0 flex-col gap-2 text-sm font-medium">
 Return reason
 <Textarea
 id="return-reason"
 value={reason}
 onChange={event => setReason(event.target.value)}
 placeholder="Explain why this unit is being returned"
 aria-invalid={!reason.trim()}
 className="min-w-0"
 />
 </label>
 </div>

 <DialogFooter className="min-w-0 sm:flex-wrap">
 <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
 <Button type="button" variant="destructive" disabled={!reason.trim()} onClick={submitReturn}>
 <RotateCcw data-icon="inline-start" />
 Confirm return
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
};
