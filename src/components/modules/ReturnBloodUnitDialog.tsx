import React, { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBloodData } from '../../context/BloodDataContext';
import { BloodUnit } from '../../types/blood';
import { RETURN_REASONS, ReturnReason } from '../../lib/bloodReturn';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';

interface ReturnBloodUnitDialogProps {
 unit: BloodUnit | null;
 open: boolean;
 onOpenChange: (open: boolean) => void;
}

export const ReturnBloodUnitDialog: React.FC<ReturnBloodUnitDialogProps> = ({ unit, open, onOpenChange }) => {
 const { user } = useAuth();
 const { returnBloodUnit } = useBloodData();
 const [reasons, setReasons] = useState<ReturnReason[]>([]);

 useEffect(() => {
 if (!open) setReasons([]);
 }, [open]);

 if (!unit?.receivedFrom) return null;

 const toggleReason = (reason: ReturnReason, checked: boolean) => {
 setReasons(current => checked ? [...current, reason] : current.filter(item => item !== reason));
 };

 const origin = unit.receivedFrom;
 const submitReturn = () => {
 if (!user || reasons.length === 0) return;
 const returned = returnBloodUnit(unit.id, user.facilityCode, user.facilityName, reasons);
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
 <fieldset className="flex min-w-0 flex-col gap-2" aria-invalid={reasons.length === 0}>
 <legend className="text-sm font-medium">Return reason</legend>
 <p className="text-xs text-muted-foreground">Select all applicable reasons.</p>
 {RETURN_REASONS.map(reason => {
 const id = `return-reason-${reason.replace(/[^a-z]+/gi, '-').toLowerCase()}`;
 return <label key={reason} htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm font-medium transition-colors hover:bg-muted/50">
 <Checkbox id={id} checked={reasons.includes(reason)} onCheckedChange={checked => toggleReason(reason, checked === true)} />
 <span>{reason}</span>
 </label>;
 })}
 </fieldset>
 </div>

 <DialogFooter className="min-w-0 sm:flex-wrap">
 <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
 <Button type="button" variant="destructive" disabled={reasons.length === 0} onClick={submitReturn}>
 <RotateCcw data-icon="inline-start" />
 Confirm return
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
};
