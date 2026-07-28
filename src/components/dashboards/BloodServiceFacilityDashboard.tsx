import { Button } from '../ui/button';
import React, { useMemo, useState } from 'react';
import { Input } from '../ui/input';
import { 
 Building2, 
 Droplet, 
 Flame, 
 Activity, 
 ShieldCheck, 
 Plus, 
 CheckCircle2, 
 Clock, 
 AlertTriangle, 
 User, 
 FileText,
 Thermometer,
} from 'lucide-react';
import { useBloodData } from '../../context/BloodDataContext';
import { useAuth } from '../../context/AuthContext';
import { UnitDetailModal } from '../common/UnitDetailModal';
import { BloodUnit, TransfusionLog } from '../../types/blood';
import { formatNumber, formatRequestDate, getStatusBadge, getBloodGroupBadgeColor } from '../../lib/utils';
import { FacilityInventoryView } from '../modules/FacilityInventoryView';
import { NetworkInventoryView } from '../modules/NetworkInventoryView';
import { FacilityBloodRequestView } from '../modules/FacilityBloodRequestView';
import { FacilityBloodRequestModal } from '../modules/FacilityBloodRequestModal';
import { RoleMetricCard } from '../dashboard/RoleDashboardPrimitives';
import { NetworkInventoryDashboardPanel } from '../dashboard/NetworkInventoryDashboardPanel';
import { NearlyExpiringUnitsPanel } from '../dashboard/NearlyExpiringUnitsPanel';
import { BLOOD_COMPONENTS, BLOOD_GROUPS, getComponentLabel } from '../../lib/bloodCatalog';
import { getBloodTypeStockLevel, isRedCellComponent } from '../../lib/bloodStockLevel';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface BloodServiceFacilityDashboardProps {
 activeTab: string;
}

export const BloodServiceFacilityDashboard: React.FC<BloodServiceFacilityDashboardProps> = ({ 
 activeTab
}) => {
 const { requisitions, bloodUnits, transfusionLogs, addTransfusionLog, updateTransfusionLog, receiveBloodRequest } = useBloodData();
 const { user } = useAuth();

 const [selectedUnit, setSelectedUnit] = useState<BloodUnit | null>(null);
 const [showTransfusionModal, setShowTransfusionModal] = useState(false);
 const [showRequestModal, setShowRequestModal] = useState(false);

 // New Transfusion Form state
 const [patientId, setPatientId] = useState('PAT-4091');
 const [patientName, setPatientName] = useState('David Miller');
 const [unitId, setUnitId] = useState('DIN-2026-8007');
 const [preTemp, setPreTemp] = useState(36.8);
 const [preBP, setPreBP] = useState('120/80');

 // Filter orders for facility
 const myRequisitions = requisitions.filter(r => r.requestingFacilityId === user?.facilityCode);
 const localStationInventory = useMemo(() => bloodUnits.filter(unit =>
 unit.currentLocation.facilityId === user?.facilityCode
 && unit.testingStatus.overall === 'Passed'
 ), [bloodUnits, user?.facilityCode]);
 const localAvailableUnits = useMemo(() => localStationInventory.filter(unit => unit.status === 'Available'), [localStationInventory]);
 const crossmatchedUnitCount = useMemo(() => localStationInventory.filter(unit => unit.status === 'Crossmatched').length, [localStationInventory]);
 const criticalAvailability = useMemo(() => {
 return BLOOD_COMPONENTS.filter(isRedCellComponent).flatMap(component => BLOOD_GROUPS.map(bloodType => {
 const count = localAvailableUnits.filter(unit => unit.component === component && unit.bloodType === bloodType).length;
 const level = getBloodTypeStockLevel(bloodType, count);
 return { bloodType, component, count, level };
 }))
 .filter(item => item.level === 'critical' || item.level === 'low')
 .sort((left, right) => (left.level === 'critical' ? -1 : 1) - (right.level === 'critical' ? -1 : 1) || left.count - right.count)
 .slice(0, 6);
 }, [localAvailableUnits]);
 const criticalStockAlertCount = useMemo(() => BLOOD_COMPONENTS.filter(isRedCellComponent).flatMap(component => BLOOD_GROUPS.map(bloodType =>
 getBloodTypeStockLevel(bloodType, localAvailableUnits.filter(unit => unit.component === component && unit.bloodType === bloodType).length)
 )).filter(level => level === 'critical').length, [localAvailableUnits]);

 const recentNetworkActivity = [...myRequisitions]
 .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt))
 .slice(0, 4);
 const componentReadiness = useMemo(() => BLOOD_COMPONENTS.map(component => ({
 component: getComponentLabel(component),
 available: localStationInventory.filter(unit => unit.component === component && unit.status === 'Available').length,
 uncrossmatched: localStationInventory.filter(unit => unit.component === component && unit.status === 'Uncrossmatched').length,
 crossmatched: localStationInventory.filter(unit => unit.component === component && unit.status === 'Crossmatched').length,
 })), [localStationInventory]);
 const componentReadinessTotal = componentReadiness.reduce((total, component) => total + component.available + component.uncrossmatched + component.crossmatched, 0);

 const handleStartTransfusion = (e: React.FormEvent) => {
 e.preventDefault();
 addTransfusionLog({
 unitId: unitId,
 patientId: patientId,
 patientName: patientName,
 facilityName: 'ESTEVEZ MEMORIAL HOSPITAL INC.',
 administeredBy: 'Nurse S. Lin, RN',
 adverseReaction: false,
 vitalSigns: {
 preTemp: Number(preTemp),
 preBP: preBP
 },
 status: 'In Progress'
 });
 setShowTransfusionModal(false);
 };

 const handleCompleteTransfusion = (logId: string) => {
 updateTransfusionLog(logId, {
 completedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
 status: 'Successfully Completed',
 vitalSigns: {
 preTemp: 36.8,
 preBP: '120/80',
 postTemp: 37.1,
 postBP: '122/82'
 }
 });
 };

 const handleReceiveOrder = (reqId: string) => {
 receiveBloodRequest(reqId);
 };

 if (activeTab === 'inventory') {
 return <FacilityInventoryView />;
 }

 if (activeTab === 'network_inventory') {
 return <NetworkInventoryView />;
 }

 if (activeTab === 'blood_requests') {
 return (
 <>
 <FacilityBloodRequestView onRequestBlood={() => setShowRequestModal(true)} />
 <FacilityBloodRequestModal isOpen={showRequestModal} onClose={() => setShowRequestModal(false)} />
 </>
 );
 }

 return (
 <div className="space-y-6">
 
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <RoleMetricCard label="Available units" value={localAvailableUnits.length} detail="Cleared and ready to issue" icon={Droplet} tone="positive" status="Ready" />
 <RoleMetricCard label="Crossmatched units" value={crossmatchedUnitCount} detail="Patient-held local inventory" icon={User} tone="neutral" status="Held" />
 <RoleMetricCard label="Orders in transit" value={myRequisitions.filter(r => r.status === 'In Transit').length} detail="Courier deliveries en route" icon={Clock} tone="attention" status="Track" />
 <RoleMetricCard label="Critical stock alerts" value={criticalStockAlertCount} detail="Whole Blood and PRBC pairs" icon={AlertTriangle} tone={criticalStockAlertCount > 0 ? 'critical' : 'positive'} status={criticalStockAlertCount > 0 ? 'Review' : 'Stable'} />
 </div>

 <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
 <div className="flex flex-col gap-3 border-b border-slate-800 bg-slate-950/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <h3 className="text-sm font-bold text-white">Component stock readiness</h3>
 <p className="mt-1 text-xs text-slate-400">Live station inventory by component and issue-ready status.</p>
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
 <Bar dataKey="available" name="Available" stackId="stock" fill="#34d399" radius={[0, 0, 0, 0]} />
 <Bar dataKey="uncrossmatched" name="Uncrossmatched" stackId="stock" fill="#fbbf24" radius={[0, 0, 0, 0]} />
 <Bar dataKey="crossmatched" name="Crossmatched" stackId="stock" fill="#a78bfa" radius={[0, 6, 6, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </section>

 <NetworkInventoryDashboardPanel />

 <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
 <div className="self-start">
 <NearlyExpiringUnitsPanel units={localStationInventory} facilityId={user?.facilityCode} onSelectUnit={setSelectedUnit} />
 </div>
 <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
 <div className="flex items-start justify-between gap-3">
 <div>
 <h3 className="text-sm font-bold text-white">Critical availability</h3>
 <p className="mt-1 text-xs leading-relaxed text-slate-400">Whole Blood and PRBC stock that needs attention before the next request.</p>
 </div>
 <AlertTriangle className="size-5 shrink-0 text-amber-400" />
 </div>
 <div className="mt-4 space-y-2">
 {criticalAvailability.length === 0 ? <p className="rounded-xl border border-emerald-900/70 bg-emerald-950/20 px-3 py-4 text-xs text-emerald-300">All monitored Whole Blood and PRBC groups are at stable levels.</p> : criticalAvailability.map(item => <div key={`${item.bloodType}-${item.component}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5"><div className="min-w-0"><p className="font-mono text-xs font-bold text-white">{item.bloodType} <span className="font-sans font-normal text-slate-400">{getComponentLabel(item.component)}</span></p><p className={`mt-1 text-[10px] font-bold uppercase tracking-wide ${item.level === 'critical' ? 'text-primary' : 'text-amber-400'}`}>{item.level === 'critical' ? 'Critical' : 'Low stock'}</p></div><span className={`font-mono text-lg font-black ${item.level === 'critical' ? 'text-primary' : 'text-amber-400'}`}>{formatNumber(item.count)}</span></div>)}
 </div>
 </section>

 <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
 <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
 <div>
 <h3 className="text-sm font-bold text-white">Recent network activity</h3>
 <p className="mt-1 text-xs leading-relaxed text-slate-400">Latest requisition updates from your connected facilities.</p>
 </div>
 <Activity className="size-5 shrink-0 text-cyan-300" />
 </div>
 <div className="mt-2 divide-y divide-slate-800">
 {recentNetworkActivity.length === 0 ? <div className="my-3 flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/50 px-6 py-8 text-center"><div className="flex size-11 items-center justify-center rounded-xl border border-cyan-900/70 bg-cyan-950/40 text-cyan-300"><Activity className="size-5" /></div><p className="mt-4 text-sm font-bold text-slate-200">Your network activity starts with a request</p><p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">Approvals, allocations, dispatches, and received blood units will appear here as your facility connects with partners.</p><Button variant="ghost" size="none" type="button" onClick={() => setShowRequestModal(true)} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-primary active:translate-y-px"><Flame className="size-3.5 fill-white" /> Create emergency request</Button></div> : recentNetworkActivity.map(request => <div key={request.id} className="flex items-start gap-3 py-3.5"><span className={`mt-1.5 size-2 shrink-0 rounded-full ${request.status === 'In Transit' ? 'bg-cyan-400' : request.status === 'Received at Facility' || request.status === 'Completed' ? 'bg-emerald-400' : request.status === 'Pending Approval' ? 'bg-amber-400' : 'bg-slate-500'}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-white">{request.id}</span><span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${getStatusBadge(request.status)}`}>{request.status}</span></div><p className="mt-1 truncate text-xs text-slate-300">{request.targetFacilityName}</p><p className="mt-1 text-[10px] text-slate-500">{formatRequestDate(request.requestedAt)}</p></div></div>)}
 </div>
 </section>
 </div>

 {/* Main Grid: Requisition Status & Safety Rules */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

 {/* Column 1 & 2: Requisition Status */}
 <div className="lg:col-span-2 space-y-6">
 
 {/* Submitted Requisition Orders Status */}
 <div id="submitted-requisitions" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
 <div className="flex items-center justify-between border-b border-slate-800 pb-3">
 <div className="flex items-center gap-2">
 <FileText className="w-5 h-5 text-primary" />
 <h3 className="font-bold text-sm text-white">Submitted Requisition Status</h3>
 </div>
 <span className="text-xs text-slate-400 font-mono">{formatNumber(myRequisitions.length)} Requests</span>
 </div>

 <div className="space-y-3">
 {myRequisitions.length === 0 ? (
 <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/50 px-6 py-8 text-center">
 <FileText className="size-8 text-slate-600" />
 <p className="mt-3 text-sm font-bold text-slate-200">No submitted requisitions</p>
 <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">Create an emergency blood request to track its approval, allocation, and delivery status here.</p>
 </div>
 ) : myRequisitions.map((req) => (
 <div key={req.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="font-mono font-bold text-white">{req.id}</span>
 <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(req.status)}`}>
 {req.status}
 </span>
 </div>
 <span className="text-[10px] font-mono text-slate-400">{req.requestedAt}</span>
 </div>

 <div className="flex items-center justify-between text-slate-300 font-medium pt-1">
 <span>
 {formatNumber(req.quantityRequested)} unit(s) <strong>{req.requiredBloodType}</strong> ({req.requiredComponent.split('(')[0]})
 </span>
 <span className="text-slate-400">{req.targetFacilityName}</span>
 </div>

 {req.status === 'In Transit' && (
 <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
 <span className="text-amber-400 font-bold text-[11px] animate-pulse">
 Thermal Express Box in transit to clinic
 </span>
 <Button variant="ghost" size="none"
 onClick={() => handleReceiveOrder(req.id)}
 className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg"
 >
 Accept into Inventory
 </Button>
 </div>
 )}
 </div>
 ))}
 </div>
 </div>

 </div>

 {/* Column 3: Safety Rules */}
 <div className="space-y-6">
 
 {/* Transfusion Safety Protocol Card */}
 <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs text-slate-300">
 <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
 <ShieldCheck className="w-5 h-5 text-emerald-400" />
 <h3 className="font-bold text-sm text-white">Two-Nurse Verification Standard</h3>
 </div>

 <ul className="space-y-2 text-[11px] text-slate-400">
 <li className="flex items-start gap-1.5">
 <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
 <span>Double-check patient wristband MRN against unit DIN.</span>
 </li>
 <li className="flex items-start gap-1.5">
 <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
 <span>Monitor vitals at 0 min, 15 min, and post-infusion.</span>
 </li>
 <li className="flex items-start gap-1.5">
 <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
 <span>Halt infusion immediately if temperature spikes &gt; 1°C.</span>
 </li>
 </ul>
 </div>

 </div>

 </div>

 {/* Start Transfusion Modal */}
 {showTransfusionModal && (
 <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 text-slate-100 space-y-4">
 <div className="flex items-center justify-between border-b border-slate-800 pb-3">
 <h3 className="font-bold text-base text-white">Start Bedside Transfusion Session</h3>
 <Button variant="ghost" size="none" onClick={() => setShowTransfusionModal(false)} className="text-slate-400 hover:text-white">✕</Button>
 </div>

 <form onSubmit={handleStartTransfusion} className="space-y-3 text-xs">
 <div>
 <label className="block text-slate-300 font-semibold mb-1">Unit DIN Number</label>
 <Input
 type="text"
 required
 value={unitId}
 onChange={(e) => setUnitId(e.target.value)}
 className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-slate-300 font-semibold mb-1">Patient MRN</label>
 <Input
 type="text"
 required
 value={patientId}
 onChange={(e) => setPatientId(e.target.value)}
 className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
 />
 </div>

 <div>
 <label className="block text-slate-300 font-semibold mb-1">Patient Name</label>
 <Input
 type="text"
 required
 value={patientName}
 onChange={(e) => setPatientName(e.target.value)}
 className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-slate-300 font-semibold mb-1">Baseline Temp (°C)</label>
 <Input
 type="number"
 step="0.1"
 required
 value={preTemp}
 onChange={(e) => setPreTemp(Number(e.target.value))}
 className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
 />
 </div>

 <div>
 <label className="block text-slate-300 font-semibold mb-1">Baseline BP</label>
 <Input
 type="text"
 required
 value={preBP}
 onChange={(e) => setPreBP(e.target.value)}
 className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
 />
 </div>
 </div>

 <div className="pt-2 flex justify-end gap-2">
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => setShowTransfusionModal(false)}
 className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
 >
 Cancel
 </Button>
 <Button variant="ghost" size="none"
 type="submit"
 className="px-5 py-2 bg-purple-600 text-white font-bold rounded-lg "
 >
 Log Session Start
 </Button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* Unit Detail Modal */}
 <UnitDetailModal
 unit={selectedUnit}
 onClose={() => setSelectedUnit(null)}
 />

 <FacilityBloodRequestModal
 isOpen={showRequestModal}
 onClose={() => setShowRequestModal(false)}
 />

 </div>
 );
};
