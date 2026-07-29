import React, { useMemo, useState } from 'react';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { BloodUnit } from '../../types/blood';
import { useAuth } from '../../context/AuthContext';
import { useBloodData } from '../../context/BloodDataContext';
import { formatNumber, getBloodGroupBadgeColor } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';

export const ReturnedUnitReviewPanel: React.FC = () => {
 const { user } = useAuth();
 const { bloodUnits, approveReturnedBloodUnit, rejectReturnedBloodUnit } = useBloodData();
 const [unitToReject, setUnitToReject] = useState<BloodUnit | null>(null);
 const pendingUnits = useMemo(() => bloodUnits.filter(unit =>
 unit.returnDetails?.reviewStatus === 'Pending'
 && unit.receivedFrom?.facilityId === user?.facilityCode
 ), [bloodUnits, user?.facilityCode]);

 if (!user || pendingUnits.length === 0) return null;

 return (
 <Card className="border-amber-800/70 bg-amber-950/10 text-slate-100">
 <CardHeader className="flex-row items-start justify-between gap-3 border-b border-amber-900/40 pb-4">
 <div className="flex items-start gap-3">
 <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-amber-800/70 bg-amber-950/50 text-amber-300"><RotateCcw className="size-4" /></div>
 <div>
 <CardTitle className="text-sm text-white">Returned units awaiting review</CardTitle>
 <CardDescription className="mt-1 text-xs leading-relaxed text-slate-400">Approve to restore the unit to your inventory, or reject to record wastage at the requester facility.</CardDescription>
 </div>
 </div>
 <Badge variant="outline" className="border-amber-800/70 bg-amber-950/40 font-mono text-amber-300">{formatNumber(pendingUnits.length)} pending</Badge>
 </CardHeader>
 <CardContent className="grid gap-2 pt-4">
 {pendingUnits.map(unit => {
 const details = unit.returnDetails!;
 return <div key={unit.id} className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3 sm:flex-row sm:items-center">
 <Badge className={`w-fit rounded px-1.5 py-0.5 text-[10px] font-bold ${getBloodGroupBadgeColor(unit.bloodType)}`}>{unit.bloodType}</Badge>
 <div className="min-w-0 flex-1"><p className="font-mono text-xs font-bold text-white">{unit.id}</p><p className="mt-1 text-[10px] text-slate-400">{unit.component} returned by {details.returningFacilityName}</p><p className="mt-1 text-[10px] text-amber-300">Reason: {details.reason}</p></div>
 <div className="flex shrink-0 gap-2">
 <Button type="button" size="sm" onClick={() => approveReturnedBloodUnit(unit.id, user.facilityCode, user.facilityName)}><CheckCircle2 data-icon="inline-start" /> Approve</Button>
 <Button type="button" variant="destructive" size="sm" onClick={() => setUnitToReject(unit)}><XCircle data-icon="inline-start" /> Reject</Button>
 </div>
 </div>;
 })}
 </CardContent>
 <AlertDialog open={Boolean(unitToReject)} onOpenChange={open => { if (!open) setUnitToReject(null); }}>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>Reject this returned blood unit?</AlertDialogTitle>
 <AlertDialogDescription>
 {unitToReject?.id ?? 'This unit'} will be recorded as wastage at {unitToReject?.returnDetails?.returningFacilityName ?? 'the requester facility'}. This action cannot be undone.
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel>Keep under review</AlertDialogCancel>
 <AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => {
 if (unitToReject) rejectReturnedBloodUnit(unitToReject.id, user.facilityCode, user.facilityName);
 setUnitToReject(null);
 }}>
 <XCircle data-icon="inline-start" /> Reject and record wastage
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 </Card>
 );
};
