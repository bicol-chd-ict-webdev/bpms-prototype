import { Button } from '../ui/button';
import React, { useMemo, useState } from 'react';
import { 
 Building2, 
 Droplet, 
 ClipboardList, 
 FlaskConical, 
 AlertOctagon, 
 CheckCircle2, 
 Clock, 
 Flame, 
 ChevronRight, 
 ShieldCheck, 
 PackageCheck, 
 AlertTriangle,
 ArrowRight,
 Send,
 TrendingUp,
} from 'lucide-react';
import { useBloodData } from '../../context/BloodDataContext';
import { useAuth } from '../../context/AuthContext';
import { BloodInventoryMatrix } from '../modules/BloodInventoryMatrix';
import { NetworkInventoryView } from '../modules/NetworkInventoryView';
import { BloodRequestView } from '../modules/BloodRequestView';
import { FacilityRequisitionDispatchDialog } from '../modules/FacilityRequisitionDispatchDialog';
import { IncomingRequisitionsPanel } from '../modules/IncomingRequisitionsPanel';
import { UnitDetailModal } from '../common/UnitDetailModal';
import { BloodUnit, RequisitionOrder } from '../../types/blood';
import { formatNumber, getStatusBadge, getBloodGroupBadgeColor } from '../../lib/utils';
import { RoleMetricCard } from '../dashboard/RoleDashboardPrimitives';
import { NetworkInventoryDashboardPanel } from '../dashboard/NetworkInventoryDashboardPanel';
import { NearlyExpiringUnitsPanel } from '../dashboard/NearlyExpiringUnitsPanel';
import { BLOOD_COMPONENTS, getComponentLabel } from '../../lib/bloodCatalog';
import { isNearExpiry } from '../../lib/bloodRelease';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface BloodBankDashboardProps {
 activeTab: string;
}

export const BloodBankDashboard: React.FC<BloodBankDashboardProps> = ({ activeTab }) => {
 const { requisitions, bloodUnits, receiveBloodRequest, updateRequisitionStatus } = useBloodData();
 const { user } = useAuth();

 const [selectedUnit, setSelectedUnit] = useState<BloodUnit | null>(null);
 const [showRequestModal, setShowRequestModal] = useState(false);
 const [dispatchRequisitionId, setDispatchRequisitionId] = useState<string | null>(null);

 // Blood bank specific stats
 const bankUnits = useMemo(() => bloodUnits.filter(unit =>
 unit.currentLocation.facilityId === user?.facilityCode
 && unit.testingStatus.overall === 'Passed'
 ), [bloodUnits, user?.facilityCode]);
 const availableUnits = bankUnits.filter(unit => unit.status === 'Available');
 const uncrossmatchedUnits = bankUnits.filter(unit => unit.status === 'Uncrossmatched');
 const crossmatchedUnits = bankUnits.filter(unit => unit.status === 'Crossmatched');
  const bankRequests = requisitions.filter(r => r.requestingFacilityId === user?.facilityCode);
 const incomingFacilityRequests = useMemo(() => requisitions
 .filter(request => request.targetFacilityId === user?.facilityCode)
 .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt)), [requisitions, user?.facilityCode]);
 const dispatchRequisition = incomingFacilityRequests.find(request => request.id === dispatchRequisitionId) ?? null;
 const inTransitReqs = bankRequests.filter(r => r.status === 'In Transit');

 // Count critical O- units at the bank
 const expiringSoonCount = bankUnits.filter(unit => isNearExpiry(unit) && !['Expired', 'Discarded', 'Transfused'].includes(unit.status)).length;
 const componentReadiness = useMemo(() => BLOOD_COMPONENTS.map(component => ({
 component: getComponentLabel(component),
 available: bankUnits.filter(unit => unit.component === component && unit.status === 'Available').length,
 uncrossmatched: bankUnits.filter(unit => unit.component === component && unit.status === 'Uncrossmatched').length,
 crossmatched: bankUnits.filter(unit => unit.component === component && unit.status === 'Crossmatched').length,
 })), [bankUnits]);
 const componentReadinessTotal = componentReadiness.reduce((total, component) => total + component.available + component.uncrossmatched + component.crossmatched, 0);
 const incomingRequisitionsPanel = (
 <section className="hidden overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
 <div className="flex flex-col gap-3 border-b border-slate-800 bg-slate-950/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <h2 className="text-sm font-bold text-white">Incoming station requisitions</h2>
 <p className="mt-1 text-xs text-slate-400">Blood-station requests targeted to this bank. Reserved units can be dispatched from here.</p>
 </div>
 <span className="font-mono text-xs text-amber-300">{formatNumber(incomingFacilityRequests.length)} requests</span>
 </div>
 <div className="grid gap-3 p-5">
 {incomingFacilityRequests.length === 0 ? <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/50 px-5 py-6 text-center"><ClipboardList className="size-7 text-slate-600" /><p className="mt-3 text-sm font-bold text-slate-200">No incoming station requisitions</p><p className="mt-1 text-xs leading-relaxed text-slate-500">Requests from blood stations to this bank will appear here.</p></div> : incomingFacilityRequests.map(request => {
 const dispatchable = ['Pending Approval', 'Cross-Matching', 'Approved & Allocated'].includes(request.status) && request.items.some(item => item.allocatedUnitIds.length > 0);
 const unitCount = request.items.reduce((total, item) => total + item.quantityRequested, 0);
 return <div key={request.id} className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-white">{request.id}</span><span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${getStatusBadge(request.status)}`}>{request.status}</span></div><p className="mt-2 text-sm font-bold text-slate-200">{request.requestingFacilityName}</p><p className="mt-1 text-[11px] text-slate-400">{request.items.map(item => `${formatNumber(item.quantityRequested)} ${item.requiredBloodType} ${getComponentLabel(item.requiredComponent)}`).join(' · ')}</p></div><div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end"><span className="font-mono text-xs text-slate-400">{formatNumber(unitCount)} units</span>{dispatchable ? <Button variant="ghost" size="none" type="button" onClick={() => updateRequisitionStatus(request.id, 'In Transit', 'Dispatched from blood bank.', request.items.flatMap(item => item.allocatedUnitIds))} className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-cyan-700"><Send className="size-3.5" /> Dispatch reserved units</Button> : <span className="text-[10px] text-slate-500">{request.status === 'In Transit' ? 'Awaiting station receipt' : 'No dispatch action available'}</span>}</div></div>;
 })}
 </div>
 </section>
 );

 const dispatchIncomingRequest = (request: RequisitionOrder, items: { id: string; quantityProvided: number; allocatedUnitIds: string[] }[], remarks: string) => {
 const isPartial = items.some(item => item.quantityProvided < (request.items.find(requestItem => requestItem.id === item.id)?.quantityRequested ?? 0));
 updateRequisitionStatus(
 request.id,
 'In Transit',
 isPartial ? `Partial fulfillment. Remarks: ${remarks}` : 'Request approved and dispatched from blood bank.',
 undefined,
 undefined,
 items,
 );
 setDispatchRequisitionId(null);
 };

 const bankIncomingRequisitionsPanel = (
 <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
 <div className="flex flex-col gap-3 border-b border-slate-800 bg-slate-950/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <h2 className="text-sm font-bold text-white">Incoming station requisitions</h2>
 <p className="mt-1 text-xs text-slate-400">Review the local eligible stock before dispatching an incoming request.</p>
 </div>
 <span className="font-mono text-xs text-amber-300">{formatNumber(incomingFacilityRequests.length)} requests</span>
 </div>
 <div className="grid gap-3 p-5">
 {incomingFacilityRequests.length === 0 ? <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/50 px-5 py-6 text-center"><ClipboardList className="size-7 text-slate-600" /><p className="mt-3 text-sm font-bold text-slate-200">No incoming station requisitions</p><p className="mt-1 text-xs leading-relaxed text-slate-500">Requests from blood stations to this bank will appear here.</p></div> : incomingFacilityRequests.map(request => {
 const dispatchable = ['Pending Approval', 'Cross-Matching', 'Approved & Allocated'].includes(request.status) && request.items.some(item => item.allocatedUnitIds.length > 0);
 const requestedUnits = request.items.reduce((total, item) => total + item.quantityRequested, 0);
 return <div key={request.id} className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-white">{request.id}</span><span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${getStatusBadge(request.status)}`}>{request.status}</span></div><p className="mt-2 text-sm font-bold text-slate-200">{request.requestingFacilityName}</p><p className="mt-1 text-[11px] text-slate-400">{request.items.map(item => `${formatNumber(item.quantityRequested)} ${item.requiredBloodType} ${getComponentLabel(item.requiredComponent)}`).join(' · ')}</p></div><div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end"><span className="font-mono text-xs text-slate-400">{formatNumber(requestedUnits)} units</span>{dispatchable ? <Button variant="ghost" size="none" type="button" onClick={() => setDispatchRequisitionId(request.id)} className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-cyan-700"><Send className="size-3.5" /> Review & dispatch</Button> : <span className="text-[10px] text-slate-500">{request.status === 'In Transit' ? 'Awaiting station receipt' : 'No dispatch action available'}</span>}</div></div>;
 })}
 </div>
 </section>
 );

 // Route to Inventory view
 if (activeTab === 'inventory') {
 return <BloodInventoryMatrix />;
 }

 if (activeTab === 'network_inventory') {
 return <NetworkInventoryView />;
 }

 // Route to Blood Request view
 if (activeTab === 'blood_requests') {
 return (
 <div className="space-y-6">
 <BloodRequestView onRequestBlood={() => setShowRequestModal(true)} incomingRequisitionsPanel={<IncomingRequisitionsPanel requests={incomingFacilityRequests} onReviewDispatch={setDispatchRequisitionId} facilityLabel="blood bank" />} />
 {/*
 return <div key={request.id} className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-white">{request.id}</span><span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${getStatusBadge(request.status)}`}>{request.status}</span></div><p className="mt-2 text-sm font-bold text-slate-200">{request.requestingFacilityName}</p><p className="mt-1 text-[11px] text-slate-400">{request.items.map(item => `${formatNumber(item.quantityRequested)} ${item.requiredBloodType} ${getComponentLabel(item.requiredComponent)}`).join(' · ')}</p></div><div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end"><span className="font-mono text-xs text-slate-400">{formatNumber(unitCount)} units</span>{dispatchable ? <Button variant="ghost" size="none" type="button" onClick={() => updateRequisitionStatus(request.id, 'In Transit', 'Dispatched from blood bank.', request.items.flatMap(item => item.allocatedUnitIds))} className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-cyan-700"><Send className="size-3.5" /> Dispatch reserved units</Button> : <span className="text-[10px] text-slate-500">{request.status === 'In Transit' ? 'Awaiting station receipt' : 'No dispatch action available'}</span>}</div></div>;
 })}
 </div>
 </section>
 </>}
 */}
 <FacilityRequisitionDispatchDialog
 request={dispatchRequisition}
 facilityId={user?.facilityCode}
 bloodUnits={bloodUnits}
 onOpenChange={open => { if (!open) setDispatchRequisitionId(null); }}
 onDispatch={dispatchIncomingRequest}
 />
 {showRequestModal && <BloodRequestModalInline onClose={() => setShowRequestModal(false)} />}
 </div>
 );
 }

 // Default: Dashboard view
 return (
 <div className="space-y-6">
 
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <RoleMetricCard label="Available units" value={availableUnits.length} detail="Usable bank inventory" icon={Droplet} tone="positive" status="Ready" />
 <RoleMetricCard label="Uncrossmatched units" value={uncrossmatchedUnits.length} detail="Awaiting patient matching" icon={FlaskConical} tone="attention" status="Review" />
 <RoleMetricCard label="Crossmatched units" value={crossmatchedUnits.length} detail="Patient-held bank inventory" icon={ShieldCheck} tone="neutral" status="Held" />
 <RoleMetricCard label="Short-dated units" value={expiringSoonCount} detail="Expires within five days" icon={AlertOctagon} tone="attention" status="Priority use" />
 </div>

 <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
 <div className="flex flex-col gap-3 border-b border-slate-800 bg-slate-950/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <h3 className="text-sm font-bold text-white">Component stock readiness</h3>
 <p className="mt-1 text-xs text-slate-400">Live blood-bank inventory by component and issue status.</p>
 </div>
 <span className="font-mono text-xs text-slate-400">{formatNumber(componentReadinessTotal)} tested units</span>
 </div>
 <div className="h-80 px-2 py-4 sm:px-5">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={componentReadiness} layout="vertical" margin={{ top: 4, right: 18, bottom: 4, left: 12 }}>
 <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
 <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--chart-axis)', fontSize: 11 }} axisLine={false} tickLine={false} />
 <YAxis type="category" dataKey="component" width={136} tick={{ fill: 'var(--chart-axis-strong)', fontSize: 11 }} axisLine={false} tickLine={false} />
 <Tooltip cursor={{ fill: 'var(--chart-cursor)' }} contentStyle={{ backgroundColor: 'var(--chart-tooltip)', border: '1px solid var(--chart-tooltip-border)', borderRadius: '10px', color: 'var(--chart-tooltip-foreground)', fontSize: 12 }} labelStyle={{ color: 'var(--chart-tooltip-foreground)', fontWeight: 700 }} itemStyle={{ color: 'var(--chart-axis-strong)' }} formatter={(value: number) => [formatNumber(value), 'Units']} />
 <Legend verticalAlign="top" align="right" iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: 'var(--chart-axis)', paddingBottom: 12 }} />
 <Bar dataKey="available" name="Available" stackId="stock" fill="#34d399" />
 <Bar dataKey="uncrossmatched" name="Uncrossmatched" stackId="stock" fill="#fbbf24" />
 <Bar dataKey="crossmatched" name="Crossmatched" stackId="stock" fill="#a78bfa" radius={[0, 6, 6, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </section>

 <NetworkInventoryDashboardPanel />

 {/* Recent Requests & In Transit */}
 <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

 {/* Recent Blood Requests */}
 <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 ">
 <div className="flex items-center justify-between border-b border-slate-800 pb-3">
 <div className="flex items-center gap-2">
 <ClipboardList className="w-5 h-5 text-primary" />
 <h3 className="font-bold text-sm text-white">Recent Blood Requests</h3>
 </div>
 <span className="text-xs text-slate-400 font-mono">{formatNumber(bankRequests.length)} Total</span>
 </div>

 <div className="space-y-2">
 {bankRequests.slice(0, 5).map((req) => (
 <div 
 key={req.id} 
 className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between"
 >
 <div className="flex items-center gap-3">
 <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getBloodGroupBadgeColor(req.requiredBloodType)}`}>
 {req.requiredBloodType}
 </span>
 <div>
 <span className="font-mono font-bold text-white text-xs">{req.id}</span>
 <p className="text-[10px] text-slate-400">{req.requiredComponent.split('(')[0]} · {formatNumber(req.quantityRequested)} units</p>
 </div>
 </div>
 <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(req.status)}`}>
 {req.status}
 </span>
 </div>
 ))}

 {bankRequests.length === 0 && (
 <div className="text-center py-8 text-slate-500">
 <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
 <p className="text-xs">No blood requests yet</p>
 </div>
 )}
 </div>
 </div>

 {/* In Transit Shipments */}
 <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 ">
 <div className="flex items-center justify-between border-b border-slate-800 pb-3">
 <div className="flex items-center gap-2">
 <PackageCheck className="w-5 h-5 text-cyan-400" />
 <h3 className="font-bold text-sm text-white">In Transit Shipments</h3>
 </div>
 <span className="text-xs text-cyan-400 font-mono font-bold">{formatNumber(inTransitReqs.length)} Active</span>
 </div>

 <div className="space-y-2">
 {inTransitReqs.map((req) => (
 <div 
 key={req.id} 
 className="p-4 bg-cyan-950/20 border border-cyan-900/40 rounded-xl space-y-3"
 >
 <div className="flex items-center justify-between">
 <div>
 <span className="font-mono font-bold text-white text-xs">{req.id}</span>
 <p className="text-[10px] text-slate-400 mt-0.5">
 {req.requiredBloodType} · {req.requiredComponent.split('(')[0]} · {formatNumber(req.quantityProvided || req.quantityRequested)} units
 </p>
 </div>
 <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px] font-bold border border-cyan-800">
 In Transit
 </span>
 </div>
 <Button variant="ghost" size="none"
 onClick={() => receiveBloodRequest(req.id)}
 className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5"
 >
 <CheckCircle2 className="w-3.5 h-3.5" />
 <span>Confirm Receipt & Add to Inventory</span>
 </Button>
 </div>
 ))}

 {inTransitReqs.length === 0 && (
 <div className="text-center py-8 text-slate-500">
 <PackageCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
 <p className="text-xs">No shipments in transit</p>
 </div>
 )}
 </div>
 </div>

 <div className="self-start">
 <NearlyExpiringUnitsPanel units={bankUnits} facilityId={user?.facilityCode} onSelectUnit={setSelectedUnit} />
 </div>

 </div>

 {/* Inline Request Modal */}
 {showRequestModal && <BloodRequestModalInline onClose={() => setShowRequestModal(false)} />}

 {/* Unit Detail Modal */}
 <UnitDetailModal
 unit={selectedUnit}
 onClose={() => setSelectedUnit(null)}
 />

 </div>
 );
};

// Inline wrapper to avoid circular import - imports the modal lazily
const BloodRequestModalInline: React.FC<{ onClose: () => void }> = ({ onClose }) => {
 // Lazy import workaround: We import the BloodRequestModal component
 const [BloodRequestModal, setModal] = React.useState<React.FC<{ isOpen: boolean; onClose: () => void }> | null>(null);
 
 React.useEffect(() => {
 import('../modules/BloodRequestModal').then(mod => {
 setModal(() => mod.BloodRequestModal);
 });
 }, []);

 if (!BloodRequestModal) return null;
 return <BloodRequestModal isOpen={true} onClose={onClose} />;
};
