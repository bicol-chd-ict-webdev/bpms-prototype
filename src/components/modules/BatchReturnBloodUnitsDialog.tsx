import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RotateCcw, Search, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBloodData } from '../../context/BloodDataContext';
import { BloodUnit } from '../../types/blood';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '../ui/input-group';
import { Textarea } from '../ui/textarea';
import { formatNumber } from '../../lib/utils';

interface BatchReturnBloodUnitsDialogProps {
 eligibleUnits: BloodUnit[];
 open: boolean;
 onOpenChange: (open: boolean) => void;
}

export const BatchReturnBloodUnitsDialog: React.FC<BatchReturnBloodUnitsDialogProps> = ({ eligibleUnits, open, onOpenChange }) => {
 const { user } = useAuth();
 const { returnBloodUnits } = useBloodData();
 const [serialQuery, setSerialQuery] = useState('');
 const [queuedIds, setQueuedIds] = useState<string[]>([]);
 const [reason, setReason] = useState('');
 const [queueError, setQueueError] = useState('');

 const queuedUnits = useMemo(() => eligibleUnits.filter(unit => queuedIds.includes(unit.id)), [eligibleUnits, queuedIds]);
 const origin = queuedUnits[0]?.receivedFrom;
 const matches = useMemo(() => {
 const query = serialQuery.trim().toLowerCase();
 if (!query) return [];
 return eligibleUnits.filter(unit => !queuedIds.includes(unit.id) && unit.id.toLowerCase().includes(query)).slice(0, 6);
 }, [eligibleUnits, queuedIds, serialQuery]);

 useEffect(() => {
 if (!open) {
 setSerialQuery('');
 setQueuedIds([]);
 setReason('');
 setQueueError('');
 }
 }, [open]);

 const addUnit = (unit: BloodUnit) => {
 const unitOrigin = unit.receivedFrom;
 if (!unitOrigin) return;
 if (origin && unitOrigin.facilityId !== origin.facilityId) {
 setQueueError(`This batch is locked to ${origin.facilityName}. Start another batch for ${unitOrigin.facilityName}.`);
 return;
 }
 setQueuedIds(current => [...current, unit.id]);
 setSerialQuery('');
 setQueueError('');
 };

 const addExactSerial = () => {
 const unit = eligibleUnits.find(item => item.id.toLowerCase() === serialQuery.trim().toLowerCase());
 if (!unit) {
 setQueueError('No eligible unit matches that DIN.');
 return;
 }
 addUnit(unit);
 };

 const submitBatch = () => {
 if (!user || !origin || !reason.trim()) return;
 if (returnBloodUnits(queuedIds, user.facilityCode, user.facilityName, reason)) onOpenChange(false);
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
 <DialogHeader>
 <DialogTitle>Return blood units</DialogTitle>
 <DialogDescription>Search or scan a DIN to add it. A batch can return units to one original source facility only.</DialogDescription>
 </DialogHeader>

 <div className="flex flex-col gap-4">
 <InputGroup>
 <InputGroupInput value={serialQuery} onChange={event => { setSerialQuery(event.target.value); setQueueError(''); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addExactSerial(); } }} placeholder="Search or scan DIN" aria-label="Search or scan DIN" />
 <InputGroupAddon><Search /></InputGroupAddon>
 <InputGroupAddon align="inline-end">
 <InputGroupButton type="button" size="xs" onClick={addExactSerial} disabled={!serialQuery.trim()}>
 <Plus data-icon="inline-start" /> Add
 </InputGroupButton>
 </InputGroupAddon>
 </InputGroup>

 {matches.length > 0 && (
 <div className="flex flex-col gap-2 rounded-md border p-2">
 {matches.map(unit => <Button key={unit.id} type="button" variant="ghost" className="justify-start" onClick={() => addUnit(unit)}>
 <Plus data-icon="inline-start" /> <span className="font-mono">{unit.id}</span> · {unit.bloodType} {unit.component}
 </Button>)}
 </div>
 )}

 {queueError && <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{queueError}</p>}

 <div className="rounded-md border p-3">
 <div className="flex items-center justify-between"><p className="font-medium">Return queue</p><span className="text-sm text-muted-foreground">{formatNumber(queuedUnits.length)} unit{queuedUnits.length === 1 ? '' : 's'}</span></div>
 {origin && <p className="mt-1 text-sm text-muted-foreground">Destination: <span className="font-medium text-foreground">{origin.facilityName}</span></p>}
 <div className="mt-3 flex flex-col gap-2">
 {queuedUnits.map(unit => <div key={unit.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm"><span className="min-w-0 truncate font-mono">{unit.id}</span><Button type="button" variant="ghost" size="icon-xs" onClick={() => setQueuedIds(current => current.filter(id => id !== unit.id))} aria-label={`Remove ${unit.id} from return queue`}><X /></Button></div>)}
 {queuedUnits.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Search or scan a unit serial to start the batch.</p>}
 </div>
 </div>

 <label htmlFor="batch-return-reason" className="flex flex-col gap-2 text-sm font-medium">Return reason
 <Textarea id="batch-return-reason" value={reason} onChange={event => setReason(event.target.value)} placeholder="Explain why these units are being returned" aria-invalid={queuedUnits.length > 0 && !reason.trim()} />
 </label>
 </div>

 <DialogFooter>
 <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
 <Button type="button" variant="destructive" disabled={!origin || !reason.trim()} onClick={submitBatch}><RotateCcw data-icon="inline-start" /> Return {queuedUnits.length ? formatNumber(queuedUnits.length) : ''} unit{queuedUnits.length === 1 ? '' : 's'}</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
};
