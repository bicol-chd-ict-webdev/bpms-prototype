import React, { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2 } from 'lucide-react';
import { BloodUnit } from '../../types/blood';
import { daysUntilExpiry, isNearExpiry, NEAR_EXPIRY_DAYS } from '../../lib/bloodRelease';
import { getComponentLabel } from '../../lib/bloodCatalog';
import { formatNumber, getBloodGroupBadgeColor, getStatusBadge } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';

interface NearlyExpiringUnitsPanelProps {
 units: BloodUnit[];
 facilityId?: string;
 onSelectUnit: (unit: BloodUnit) => void;
}

const formatExpiryDate = (date: string) => new Intl.DateTimeFormat('en-PH', {
 month: 'short',
 day: 'numeric',
 year: 'numeric',
}).format(new Date(`${date}T00:00:00`));

const getExpiryLabel = (daysRemaining: number) => {
 if (daysRemaining === 0) return 'Expires today';
 if (daysRemaining === 1) return '1 day left';
 return `${formatNumber(daysRemaining)} days left`;
};

const ExpiringUnitRow: React.FC<{ unit: BloodUnit; onSelectUnit: (unit: BloodUnit) => void }> = ({ unit, onSelectUnit }) => {
 const daysRemaining = daysUntilExpiry(unit.expiryDate);
 const urgent = daysRemaining <= 1;

 return (
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => onSelectUnit(unit)}
 className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-left transition-colors hover:border-amber-700/70 hover:bg-slate-900"
 >
 <Badge className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${getBloodGroupBadgeColor(unit.bloodType)}`}>{unit.bloodType}</Badge>
 <div className="min-w-0 flex-1">
 <p className="truncate font-mono text-xs font-bold text-white">{unit.id}</p>
 <p className="mt-1 truncate text-[10px] text-slate-400">{getComponentLabel(unit.component)}</p>
 </div>
 <div className="shrink-0 text-right">
 <p className={`text-xs font-bold ${urgent ? 'text-primary' : 'text-amber-300'}`}>{getExpiryLabel(daysRemaining)}</p>
 <p className="mt-1 text-[10px] text-slate-500">{formatExpiryDate(unit.expiryDate)}</p>
 <Badge variant="outline" className={`mt-1 rounded border px-1.5 py-0.5 text-[9px] font-bold ${getStatusBadge(unit.status)}`}>{unit.status}</Badge>
 </div>
 </Button>
 );
};

export const NearlyExpiringUnitsPanel: React.FC<NearlyExpiringUnitsPanelProps> = ({ units, facilityId, onSelectUnit }) => {
 const [showAllUnits, setShowAllUnits] = useState(false);
 const nearlyExpiringUnits = useMemo(() => units
 .filter(unit =>
 unit.currentLocation.facilityId === facilityId
 && unit.testingStatus.overall === 'Passed'
 && isNearExpiry(unit)
 && !['Expired', 'Discarded', 'Transfused'].includes(unit.status)
 )
 .sort((left, right) => left.expiryDate.localeCompare(right.expiryDate) || left.id.localeCompare(right.id)), [facilityId, units]);
 const previewUnits = nearlyExpiringUnits.slice(0, 3);

 const handleSelectUnit = (unit: BloodUnit) => {
 setShowAllUnits(false);
 onSelectUnit(unit);
 };

 return (
 <>
 <Card className="gap-0 overflow-hidden border-slate-800 bg-slate-900 py-0 text-slate-100">
 <CardHeader className="border-b border-slate-800 bg-slate-950/50 px-5 py-4">
 <div className="flex items-start gap-3">
 <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-amber-900/70 bg-amber-950/50 text-amber-300">
 <CalendarClock className="size-4" />
 </div>
 <div>
 <CardTitle className="text-sm font-bold text-white">Nearly expiring units</CardTitle>
 <CardDescription className="mt-1 text-xs leading-relaxed text-slate-400">Cleared local units expiring within the next {NEAR_EXPIRY_DAYS} days, ordered by soonest expiry.</CardDescription>
 </div>
 </div>
 <CardAction>
 <Badge variant="outline" className="border-amber-800/70 bg-amber-950/40 font-mono text-amber-300">
 {formatNumber(nearlyExpiringUnits.length)} units
 </Badge>
 </CardAction>
 </CardHeader>
 <CardContent className="px-5 py-4">
 {nearlyExpiringUnits.length === 0 ? (
 <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/50 px-5 py-6 text-center">
 <CheckCircle2 className="size-6 text-emerald-400" />
 <p className="mt-3 text-sm font-bold text-slate-200">No near-expiry units</p>
 <p className="mt-1 text-xs leading-relaxed text-slate-500">All cleared local units have more than {NEAR_EXPIRY_DAYS} days of shelf life remaining.</p>
 </div>
 ) : (
 <div className="grid gap-2">
 {previewUnits.map(unit => <ExpiringUnitRow key={unit.id} unit={unit} onSelectUnit={handleSelectUnit} />)}
 </div>
 )}
 </CardContent>
 {nearlyExpiringUnits.length > 0 && (
 <CardFooter className="border-t border-slate-800 px-5 py-3">
 <Button variant="outline" size="sm" onClick={() => setShowAllUnits(true)} className="w-full border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800 hover:text-white">
 View all nearly expiring units ({formatNumber(nearlyExpiringUnits.length)})
 </Button>
 </CardFooter>
 )}
 </Card>

 <Dialog open={showAllUnits} onOpenChange={setShowAllUnits}>
 <DialogContent className="max-h-[85vh] gap-0 overflow-hidden border-slate-700 bg-slate-900 p-0 text-slate-100 sm:max-w-3xl">
 <DialogHeader className="border-b border-slate-800 bg-slate-950/50 px-6 py-5 text-left">
 <DialogTitle className="text-base text-white">All nearly expiring units</DialogTitle>
 <DialogDescription className="text-xs leading-relaxed text-slate-400">{formatNumber(nearlyExpiringUnits.length)} cleared local units expiring within the next {NEAR_EXPIRY_DAYS} days, ordered by soonest expiry.</DialogDescription>
 </DialogHeader>
 <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
 <div className="grid gap-2">
 {nearlyExpiringUnits.map(unit => <ExpiringUnitRow key={unit.id} unit={unit} onSelectUnit={handleSelectUnit} />)}
 </div>
 </div>
 <DialogFooter showCloseButton className="border-t border-slate-800 bg-slate-950/50 px-6 py-4" />
 </DialogContent>
 </Dialog>
 </>
 );
};
