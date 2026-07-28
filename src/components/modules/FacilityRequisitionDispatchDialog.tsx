import React, { useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { BloodUnit, RequisitionOrder } from '../../types/blood';
import { prioritizeUnitsForRelease } from '../../lib/bloodRelease';
import { formatNumber, getBloodGroupBadgeColor } from '../../lib/utils';
import { getComponentLabel } from '../../lib/bloodCatalog';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

interface FacilityRequisitionDispatchDialogProps {
 request: RequisitionOrder | null;
 facilityId?: string;
 bloodUnits: BloodUnit[];
 onOpenChange: (open: boolean) => void;
 onDispatch: (request: RequisitionOrder, items: { id: string; quantityProvided: number; allocatedUnitIds: string[] }[], remarks: string) => void;
}

export const FacilityRequisitionDispatchDialog: React.FC<FacilityRequisitionDispatchDialogProps> = ({
 request,
 facilityId,
 bloodUnits,
 onOpenChange,
 onDispatch,
}) => {
 const [providedQuantities, setProvidedQuantities] = useState<Record<string, number>>({});
 const [remarks, setRemarks] = useState('');

 useEffect(() => {
 if (!request) return;
 setProvidedQuantities(Object.fromEntries(request.items.map(item => [item.id, item.quantityRequested])));
 setRemarks('');
 }, [request]);

 const dispatchItems = useMemo(() => request?.items.map(item => {
 const selectedQuantity = Math.min(Math.max(0, providedQuantities[item.id] ?? item.quantityRequested), item.quantityRequested);
 const reservedUnits = prioritizeUnitsForRelease(bloodUnits.filter(unit =>
 unit.currentLocation.facilityId === facilityId
 && item.allocatedUnitIds.includes(unit.id)
 && unit.status === 'Reserved'
 && unit.testingStatus.overall === 'Passed'
 ));
 const availableUnits = prioritizeUnitsForRelease(bloodUnits.filter(unit =>
 unit.currentLocation.facilityId === facilityId
 && unit.bloodType === item.requiredBloodType
 && unit.component === item.requiredComponent
 && unit.status === 'Available'
 && unit.testingStatus.overall === 'Passed'
 ));
 const eligibleUnits = reservedUnits.length > 0 ? reservedUnits : availableUnits;
 const quantityProvided = Math.min(selectedQuantity, eligibleUnits.length);

 return {
 item,
 selectedQuantity,
 availableQuantity: eligibleUnits.length,
 quantityProvided,
 allocatedUnitIds: eligibleUnits.slice(0, quantityProvided).map(unit => unit.id),
 };
 }) ?? [], [bloodUnits, facilityId, providedQuantities, request]);

 const hasShortfall = dispatchItems.some(({ item, quantityProvided }) => quantityProvided < item.quantityRequested);

 const handleDispatch = () => {
 if (!request || (hasShortfall && !remarks.trim())) return;
 onDispatch(request, dispatchItems.map(({ item, quantityProvided, allocatedUnitIds }) => ({
 id: item.id,
 quantityProvided,
 allocatedUnitIds,
 })), remarks.trim());
 };

 return (
 <Dialog open={Boolean(request)} onOpenChange={onOpenChange}>
 <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
 <DialogHeader>
 <DialogTitle>Review requisition dispatch</DialogTitle>
 <DialogDescription>
 Set the quantity to provide for {request?.requestingFacilityName ?? 'the requesting facility'}. The system checks local eligible stock before dispatch.
 </DialogDescription>
 </DialogHeader>

 <div className="flex flex-col gap-3">
 {dispatchItems.map(({ item, selectedQuantity, availableQuantity, quantityProvided }) => (
 <div key={item.id} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
 <div>
 <div className="flex items-center gap-2"><span className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${getBloodGroupBadgeColor(item.requiredBloodType)}`}>{item.requiredBloodType}</span><span className="text-sm font-semibold text-white">{getComponentLabel(item.requiredComponent)}</span></div>
 <p className="mt-2 text-xs text-slate-400">Requested <strong className="text-white">{formatNumber(item.quantityRequested)}</strong> · Eligible <strong className={availableQuantity < item.quantityRequested ? 'text-amber-400' : 'text-emerald-400'}>{formatNumber(availableQuantity)}</strong> · Dispatching <strong className={quantityProvided < item.quantityRequested ? 'text-amber-400' : 'text-emerald-400'}>{formatNumber(quantityProvided)}</strong></p>
 </div>
 <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Provide units
 <Input type="number" min={0} max={item.quantityRequested} value={selectedQuantity} onChange={event => setProvidedQuantities(current => ({ ...current, [item.id]: Math.min(item.quantityRequested, Math.max(0, Number(event.target.value) || 0)) }))} className="w-24 text-center font-mono font-bold" />
 </label>
 </div>
 ))}

 {hasShortfall && (
 <label className="flex flex-col gap-2 rounded-xl border border-amber-800/70 bg-amber-950/30 p-4 text-xs text-amber-100">
 <span className="font-bold text-amber-300">Partial fulfillment remarks required</span>
 <span className="text-amber-200/80">Explain why the requested quantity cannot be fully supplied. This will be visible to the requesting facility.</span>
 <Textarea value={remarks} onChange={event => setRemarks(event.target.value)} placeholder="For example: remaining units are awaiting screening." rows={3} aria-invalid={!remarks.trim()} />
 </label>
 )}
 </div>

 <DialogFooter className="sm:justify-between">
 <span className="text-xs text-muted-foreground">{hasShortfall ? 'Remarks are required before partial dispatch.' : 'All requested units can be fulfilled.'}</span>
 <div className="flex flex-wrap justify-end gap-2">
 <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
 <Button type="button" disabled={hasShortfall && !remarks.trim()} onClick={handleDispatch}><Send data-icon="inline-start" />Approve & dispatch</Button>
 </div>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
};
