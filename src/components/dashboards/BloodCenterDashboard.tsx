import { Button } from '../ui/button';
import React, { useMemo, useState } from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '../ui/pagination';
import { Input } from '../ui/input';
import { getPaginationTokens } from '../../lib/pagination';
import { 
 Building2, 
 Droplet, 
 Calendar, 
 FlaskConical, 
 Truck, 
 Layers, 
 ShieldCheck, 
 Plus, 
 Activity, 
 CheckCircle2, 
 AlertTriangle,
 TrendingUp,
 Users,
 FileSpreadsheet,
 ClipboardList,
 Clock,
 ArrowUpDown,
 X,
 PackageCheck,
 Send,
} from 'lucide-react';
import { useBloodData } from '../../context/BloodDataContext';
import { useAuth } from '../../context/AuthContext';
import { BloodInventoryMatrix } from '../modules/BloodInventoryMatrix';
import { NetworkInventoryView } from '../modules/NetworkInventoryView';
import { BloodCollectionsView } from '../modules/BloodCollectionsView';
import { UnitDetailModal } from '../common/UnitDetailModal';
import { ExcelBatchUploadModal } from '../modules/ExcelBatchUploadModal';
import { ProcessBloodModal } from '../modules/ProcessBloodModal';
import { BloodUnit, RequisitionOrder } from '../../types/blood';
import { formatNumber, formatRequestDate, getStatusBadge, getBloodGroupBadgeColor } from '../../lib/utils';
import { prioritizeUnitsForRelease } from '../../lib/bloodRelease';
import { RoleDashboardHero, RoleMetricCard } from '../dashboard/RoleDashboardPrimitives';
import { NetworkInventoryDashboardPanel } from '../dashboard/NetworkInventoryDashboardPanel';
import { NearlyExpiringUnitsPanel } from '../dashboard/NearlyExpiringUnitsPanel';
import { BLOOD_COMPONENTS, getComponentLabel } from '../../lib/bloodCatalog';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface BloodCenterDashboardProps {
 activeTab: string;
}

export const BloodCenterDashboard: React.FC<BloodCenterDashboardProps> = ({ activeTab }) => {
 const { 
 bloodUnits, 
 donorDrives, 
 addBloodUnit, 
 addDonorDrive, 
 requisitions, 
 updateRequisitionStatus 
 } = useBloodData();
 const { user } = useAuth();

 const [showAddUnitModal, setShowAddUnitModal] = useState(false);
 const [showAddDriveModal, setShowAddDriveModal] = useState(false);
 const [showExcelModal, setShowExcelModal] = useState(false);
 const [selectedUnit, setSelectedUnit] = useState<BloodUnit | null>(null);

 // Requisitions management states
 const [providedQuantities, setProvidedQuantities] = useState<Record<string, number>>({});
 const [dispatchRemarks, setDispatchRemarks] = useState<Record<string, string>>({});
 const [approvalRequest, setApprovalRequest] = useState<RequisitionOrder | null>(null);
 const [reqSortField, setReqSortField] = useState<'id' | 'requestingFacilityName' | 'requiredBloodType' | 'status' | 'requestedAt'>('requestedAt');
 const [reqSortOrder, setReqSortOrder] = useState<'asc' | 'desc'>('desc');
 const [reqCurrentPage, setReqCurrentPage] = useState(1);
 const [reqItemsPerPage, setReqItemsPerPage] = useState(10);

 // New unit form state (default raw collection as Whole Blood)
 const [newBloodType, setNewBloodType] = useState<'A+'|'A-'|'B+'|'B-'|'AB+'|'AB-'|'O+'|'O-'>('O-');
 const [newComponent, setNewComponent] = useState<'Packed Red Blood Cells (PRBC)'|'Fresh Frozen Plasma (FFP)'|'Platelet Concentrate'|'Cryoprecipitate'|'Whole Blood'>('Whole Blood');
 const [newVolume, setNewVolume] = useState(450);
 const [donorId, setDonorId] = useState(`DNR-${Math.floor(10000 + Math.random() * 90000)}`);

 // New drive form state
 const [driveTitle, setDriveTitle] = useState('Central Community Phlebotomy Drive');
 const [driveLocation, setDriveLocation] = useState('City Sports Complex');
 const [targetUnits, setTargetUnits] = useState(100);

 // Metrics calculation
 const totalUnitsCollected = bloodUnits.length;
 const inTestingCount = bloodUnits.filter(u => u.status === 'Quarantine' || u.status === 'Testing').length;
 const passedUnitsCount = bloodUnits.filter(u => u.testingStatus.overall === 'Passed').length;
 const activeDrives = donorDrives.filter(d => d.status === 'Active Today');
 const screeningPassRate = totalUnitsCollected > 0 ? Math.round((passedUnitsCount / totalUnitsCollected) * 100) : 0;
 const centerClearedUnits = useMemo(() => bloodUnits.filter(unit =>
 unit.currentLocation.facilityId === user?.facilityCode
 && unit.testingStatus.overall === 'Passed'
 ), [bloodUnits, user?.facilityCode]);
 const centerInventory = useMemo(() => bloodUnits.filter(unit => unit.currentLocation.facilityId === user?.facilityCode), [bloodUnits, user?.facilityCode]);
 const processingQueue = useMemo(() => centerInventory.filter(unit => unit.status === 'Quarantine' || unit.status === 'Testing' || unit.testingStatus.overall === 'Testing In Progress'), [centerInventory]);
 const dispatchReadyUnits = useMemo(() => centerClearedUnits.filter(unit => unit.status === 'Available'), [centerClearedUnits]);
 const reservedForDispatch = useMemo(() => centerClearedUnits.filter(unit => unit.status === 'Reserved').length, [centerClearedUnits]);
 const inTransitUnits = useMemo(() => centerClearedUnits.filter(unit => unit.status === 'In Transit').length, [centerClearedUnits]);
 const centerNetworkRequests = useMemo(() => requisitions.filter(request => request.targetFacilityId === user?.facilityCode), [requisitions, user?.facilityCode]);
 const fulfillmentQueue = useMemo(() => centerNetworkRequests
 .filter(request => ['Pending Approval', 'Cross-Matching', 'Approved & Allocated'].includes(request.status))
 .sort((left, right) => left.requestedAt.localeCompare(right.requestedAt))
 , [centerNetworkRequests]);
 const demandByComponent = useMemo(() => BLOOD_COMPONENTS.map(component => {
 const requests = centerNetworkRequests.filter(request => ['Pending Approval', 'Cross-Matching', 'Approved & Allocated'].includes(request.status));
 const pending = requests.reduce((total, request) => total + request.items
 .filter(item => item.requiredComponent === component)
 .reduce((itemTotal, item) => itemTotal + Math.max(0, item.quantityRequested - (item.quantityProvided || 0)), 0), 0);
 const allocated = centerNetworkRequests.reduce((total, request) => total + request.items
 .filter(item => item.requiredComponent === component && ['Approved & Allocated', 'In Transit'].includes(request.status))
 .reduce((itemTotal, item) => itemTotal + (item.quantityProvided || 0), 0), 0);
 return { component: getComponentLabel(component), pending, allocated };
 }), [centerNetworkRequests]);
 const dispatchableByComponent = useMemo(() => BLOOD_COMPONENTS.map(component => ({
 component: getComponentLabel(component),
 count: dispatchReadyUnits.filter(unit => unit.component === component).length,
 })), [dispatchReadyUnits]);
 const dispatchableStockPeak = Math.max(1, ...dispatchableByComponent.map(item => item.count));

 const handleCreateUnit = (e: React.FormEvent) => {
 e.preventDefault();
 const today = new Date().toISOString().split('T')[0];
 const expiry = new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

 addBloodUnit({
 bloodType: newBloodType,
 component: newComponent,
 volumeMl: Number(newVolume),
 status: 'Quarantine',
 donationDate: today,
 expiryDate: expiry,
 testingStatus: {
 hiv: 'Pending',
 hbv: 'Pending',
 hcv: 'Negative',
 syphilis: 'Negative',
 malaria: 'Negative',
 overall: 'Testing In Progress'
 },
 currentLocation: {
 facilityId: 'NBC-METRO-01',
 facilityName: 'BICOL SOUTH LUZON SUBNATIONAL REFERENCE LABORATORY',
 role: 'blood_center',
 },
 donorId: donorId,
 notes: 'Newly collected whole blood separated into component.'
 });

 setShowAddUnitModal(false);
 };

 const handleCreateDrive = (e: React.FormEvent) => {
 e.preventDefault();
 addDonorDrive({
 title: driveTitle,
 location: driveLocation,
 date: new Date().toISOString().split('T')[0] + ' (Today)',
 targetUnits: Number(targetUnits),
 organizer: 'National Blood Center Processing Unit',
 status: 'Active Today',
 registeredDonorsCount: Math.floor(targetUnits * 0.9)
 });
 setShowAddDriveModal(false);
 };

 if (activeTab === 'network_inventory') {
 return <NetworkInventoryView />;
 }

 if (activeTab === 'blood_requests') {
 const centerIncomingRequests = requisitions.filter(request => request.targetFacilityId === user?.facilityCode);
 
 // Stats
 const totalRequests = centerIncomingRequests.length;
 const pendingRequests = centerIncomingRequests.filter(r => r.status === 'Pending Approval').length;
 const transitRequests = centerIncomingRequests.filter(r => r.status === 'In Transit').length;
 const completedRequests = centerIncomingRequests.filter(r => r.status === 'Received at Facility' || r.status === 'Completed').length;

 // Sorting
 const handleReqSort = (field: typeof reqSortField) => {
 if (reqSortField === field) {
 setReqSortOrder(reqSortOrder === 'asc' ? 'desc' : 'asc');
 } else {
 setReqSortField(field);
 setReqSortOrder('asc');
 }
 setReqCurrentPage(1);
 };

 const sortedReqs = [...centerIncomingRequests].sort((a, b) => {
 let comparison = 0;
 if (reqSortField === 'id') {
 comparison = a.id.localeCompare(b.id);
 } else if (reqSortField === 'requestingFacilityName') {
 comparison = a.requestingFacilityName.localeCompare(b.requestingFacilityName);
 } else if (reqSortField === 'status') {
 comparison = a.status.localeCompare(b.status);
 } else if (reqSortField === 'requestedAt') {
 comparison = a.requestedAt.localeCompare(b.requestedAt);
 }
 return reqSortOrder === 'asc' ? comparison : -comparison;
 });

 // Pagination
 const startIndex = (reqCurrentPage - 1) * reqItemsPerPage;
 const paginatedReqs = sortedReqs.slice(startIndex, startIndex + reqItemsPerPage);
 const totalPages = Math.ceil(sortedReqs.length / reqItemsPerPage);

 const renderSortIndicator = (field: typeof reqSortField) => {
 if (reqSortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-500" />;
 return reqSortOrder === 'asc' ? ' ▲' : ' ▼';
 };

 const getApprovedQuantity = (item: RequisitionOrder['items'][number]) => {
 const requestedApproval = providedQuantities[item.id] ?? item.quantityRequested;
 const reservedUnits = prioritizeUnitsForRelease(bloodUnits.filter(unit =>
 item.allocatedUnitIds.includes(unit.id) &&
 unit.status === 'Reserved' &&
 unit.testingStatus.overall === 'Passed'
 ));
 const availableStock = reservedUnits.length || prioritizeUnitsForRelease(bloodUnits.filter(unit =>
 unit.bloodType === item.requiredBloodType &&
 unit.component === item.requiredComponent &&
 unit.status === 'Available' &&
 unit.testingStatus.overall === 'Passed' &&
 unit.currentLocation.facilityId === user?.facilityCode
 )).length;

 return Math.min(requestedApproval, availableStock);
 };

 const handleDispatch = (req: RequisitionOrder) => {
 const updatedItems = req.items.map(item => {
 const qtyProv = getApprovedQuantity(item);
 
 // Requests reserve their chosen units at submission. Older requests without
 // reservations fall back to selecting currently available stock.
 const reservedUnits = bloodUnits.filter(unit =>
 item.allocatedUnitIds.includes(unit.id) &&
 unit.status === 'Reserved' &&
 unit.testingStatus.overall === 'Passed'
 );
 const matchingCenterUnits = reservedUnits.length > 0 ? reservedUnits : bloodUnits.filter(u => 
 u.bloodType === item.requiredBloodType &&
 u.component === item.requiredComponent &&
 u.status === 'Available' &&
 u.testingStatus.overall === 'Passed' &&
 u.currentLocation.facilityId === user?.facilityCode
 );

 const allocatedIds = prioritizeUnitsForRelease(matchingCenterUnits).slice(0, qtyProv).map(u => u.id);
 
 return {
 id: item.id,
 quantityProvided: qtyProv,
 allocatedUnitIds: allocatedIds
 };
 });

 const isPartialFulfillment = updatedItems.some(item => {
 const requestedItem = req.items.find(requestItem => requestItem.id === item.id);
 return requestedItem && item.quantityProvided < requestedItem.quantityRequested;
 });
 const remark = dispatchRemarks[req.id]?.trim();

 if (isPartialFulfillment && !remark) return;

 updateRequisitionStatus(
 req.id, 
 'In Transit', 
 isPartialFulfillment
 ? `Partial fulfillment. Remarks: ${remark}`
 : 'Batch request approved and dispatched using near-expiry-first, then FIFO allocation.',
 undefined, 
 undefined,
 updatedItems
 );
 };

 return (
 <div className="space-y-6">
 <RoleDashboardHero role="BLOOD CENTER" title="Regional requisition desk" description="Review blood-bank replenishment requests, allocate the correct units, and move approved dispatches into transit." focus="Safe allocation and timely dispatch" />

 {/* Stats Grid */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
 <div className="flex items-center justify-between text-slate-400 text-xs">
 <span>Total Bank Requests</span>
 <ClipboardList className="w-4 h-4 text-slate-400" />
 </div>
 <div className="flex items-baseline justify-between">
 <span className="text-3xl font-black font-mono text-white">{formatNumber(totalRequests)}</span>
 </div>
 <p className="text-[11px] text-slate-400">Total orders received</p>
 </div>

 <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
 <div className="flex items-center justify-between text-slate-400 text-xs">
 <span>Awaiting Action</span>
 <Clock className="w-4 h-4 text-amber-400" />
 </div>
 <div className="flex items-baseline justify-between">
 <span className="text-3xl font-black font-mono text-amber-400">{formatNumber(pendingRequests)}</span>
 </div>
 <p className="text-[11px] text-slate-400">Orders requiring dispatch</p>
 </div>

 <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
 <div className="flex items-center justify-between text-slate-400 text-xs">
 <span>In Transit</span>
 <Truck className="w-4 h-4 text-cyan-400" />
 </div>
 <div className="flex items-baseline justify-between">
 <span className="text-3xl font-black font-mono text-cyan-400">{formatNumber(transitRequests)}</span>
 </div>
 <p className="text-[11px] text-slate-400">Dispatched courier deliveries</p>
 </div>

 <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
 <div className="flex items-center justify-between text-slate-400 text-xs">
 <span>Completed</span>
 <CheckCircle2 className="w-4 h-4 text-emerald-400" />
 </div>
 <div className="flex items-baseline justify-between">
 <span className="text-3xl font-black font-mono text-emerald-400">{formatNumber(completedRequests)}</span>
 </div>
 <p className="text-[11px] text-slate-400">Received by hospitals</p>
 </div>
 </div>

 {/* Requests Table */}
 <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden ">
 <div className="p-4 border-b border-slate-800 flex items-center justify-between">
 <div className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-primary" /><h3 className="font-bold text-sm text-white">Incoming Requisitions</h3></div>
 <span className="text-xs text-slate-400 font-mono">Showing {formatNumber(sortedReqs.length === 0 ? 0 : startIndex + 1)}–{formatNumber(Math.min(startIndex + reqItemsPerPage, sortedReqs.length))} of {formatNumber(sortedReqs.length)} records</span>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
 <tr>
 <th className="py-3 px-4 cursor-pointer" onClick={() => handleReqSort('id')}>
 <div className="flex items-center">
 Req ID {renderSortIndicator('id')}
 </div>
 </th>
 <th className="py-3 px-4 cursor-pointer" onClick={() => handleReqSort('requestingFacilityName')}>
 <div className="flex items-center">
 Requesting Facility {renderSortIndicator('requestingFacilityName')}
 </div>
 </th>
 <th className="py-3 px-4 text-center">Total Items</th>
 <th className="py-3 px-4 cursor-pointer" onClick={() => handleReqSort('status')}>
 <div className="flex items-center">
 Status {renderSortIndicator('status')}
 </div>
 </th>
 <th className="py-3 px-4 cursor-pointer" onClick={() => handleReqSort('requestedAt')}>
 <div className="flex items-center">
 Requested Date {renderSortIndicator('requestedAt')}
 </div>
 </th>
 <th className="py-3 px-4 text-right">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-800/60 font-medium">
 {paginatedReqs.map((req) => {
 const totalReqQty = req.items ? req.items.reduce((s, it) => s + it.quantityRequested, 0) : req.quantityRequested || 0;

 return (
 <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
 <td className="py-3 px-4 font-mono font-bold text-white align-top">{req.id}</td>
 <td className="py-3 px-4 text-slate-300 align-top">{req.requestingFacilityName}</td>
 <td className="hidden">
 <div className="space-y-3 max-w-lg">
 {req.items && req.items.map((item, idx) => {
 const centerStock = bloodUnits.filter(u => 
 u.bloodType === item.requiredBloodType && 
 u.component === item.requiredComponent && 
 u.status === 'Available' &&
 u.testingStatus.overall === 'Passed' &&
 u.currentLocation.role === 'blood_center'
 ).length;

 return (
 <div key={idx} className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-2 rounded-xl border border-slate-850">
 <div className="flex items-center gap-2">
 <span className={`px-2 py-0.5 text-[9px] font-bold font-mono rounded ${getBloodGroupBadgeColor(item.requiredBloodType)}`}>
 {item.requiredBloodType}
 </span>
 <span className="font-semibold text-slate-205">{item.requiredComponent.split('(')[0]}</span>
 </div>
 
 <div className="flex items-center gap-4">
 <span className="text-[10px] text-slate-400">
 Req: <strong className="text-white">{formatNumber(item.quantityRequested)}</strong> · 
 Stock: <strong className={centerStock >= item.quantityRequested ? 'text-emerald-400' : 'text-amber-450'}>{formatNumber(centerStock)} avail</strong>
 </span>

 {req.status !== 'Pending Approval' && (
 <span className="font-mono text-slate-455 text-[11px]">
 Provided: <strong className="text-emerald-400">{formatNumber(item.quantityProvided !== undefined ? item.quantityProvided : item.quantityRequested)}</strong>
 </span>
 )}
 </div>
 </div>
 );
 })}
 </div>
 </td>
 <td className="py-3 px-4 text-center font-mono text-slate-200 align-top">
 {formatNumber(req.items ? req.items.length : 1)} items ({formatNumber(totalReqQty)} units)
 </td>
 <td className="py-3 px-4 align-top">
 <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(req.status)}`}>
 {req.status}
 </span>
 </td>
 <td className="py-3 px-4 text-slate-400 align-top">{formatRequestDate(req.requestedAt)}</td>
 <td className="py-3 px-4 text-right align-top">
 {req.status === 'Pending Approval' ? (
 <Button variant="ghost" size="none"
 onClick={() => setApprovalRequest(req)}
 className="ml-auto px-3 py-1.5 bg-primary hover:bg-primary text-white font-bold rounded-lg text-[10px] transition-all flex items-center gap-1"
 >
 <Truck className="w-3.5 h-3.5" />
 <span>Review & Approve</span>
 </Button>
 ) : (
 <span className="text-[10px] text-slate-500 italic">Processed</span>
 )}
 </td>
 </tr>
 );
 })}

 {paginatedReqs.length === 0 && (
 <tr>
 <td colSpan={6} className="py-8 text-center text-slate-500">
 <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
 <p className="text-sm font-semibold">No requisitions received</p>
 <p className="text-xs text-slate-600 mt-0.5">Replenishment requests from banks will appear here</p>
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>

 {/* Pagination Footer */}
 {sortedReqs.length > 0 && (
 <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-800 bg-slate-950 px-4 py-3 text-xs text-slate-400 sm:flex-row">
 <div className="flex items-center gap-2"><label htmlFor="request-rows-per-page">Rows per page</label><Select value={String(reqItemsPerPage)} onValueChange={(value) => { setReqItemsPerPage(Number(value)); setReqCurrentPage(1); }}><SelectTrigger id="request-rows-per-page" size="sm"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{[5, 10, 25].map(size => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectGroup></SelectContent></Select></div>

 <Pagination className="ml-auto mr-0 w-auto"><PaginationContent>
 <PaginationItem><PaginationPrevious href="#" onClick={(event) => { event.preventDefault(); setReqCurrentPage(page => Math.max(1, page - 1)); }} aria-disabled={reqCurrentPage === 1} /></PaginationItem>
 {getPaginationTokens(totalPages, reqCurrentPage).map(token => token === 'ellipsis-left' || token === 'ellipsis-right' ? <PaginationItem key={token}><PaginationEllipsis /></PaginationItem> : <PaginationItem key={token}><PaginationLink href="#" isActive={token === reqCurrentPage} onClick={(event) => { event.preventDefault(); setReqCurrentPage(token); }}>{token}</PaginationLink></PaginationItem>)}
 <PaginationItem><PaginationNext href="#" onClick={(event) => { event.preventDefault(); setReqCurrentPage(page => Math.min(totalPages, page + 1)); }} aria-disabled={reqCurrentPage === totalPages} /></PaginationItem>
 </PaginationContent></Pagination>
 </div>
 )}
 </div>
 {approvalRequest && (
 <ApprovalRequestModal
 request={approvalRequest}
 bloodUnits={bloodUnits}
 providedQuantities={providedQuantities}
 remark={dispatchRemarks[approvalRequest.id] ?? ''}
 onClose={() => setApprovalRequest(null)}
 onQuantityChange={(itemId, quantity) => setProvidedQuantities(current => ({ ...current, [itemId]: quantity }))}
 onRemarkChange={(remark) => setDispatchRemarks(current => ({ ...current, [approvalRequest.id]: remark }))}
 onApprove={() => {
 handleDispatch(approvalRequest);
 setApprovalRequest(null);
 }}
 />
 )}
 </div>
 );
 }

 if (activeTab === 'inventory') {
 return <BloodInventoryMatrix onOpenAddUnit={() => setShowAddUnitModal(true)} />;
 }

 if (activeTab === 'collections') {
 return <BloodCollectionsView onOpenAddUnit={() => setShowAddUnitModal(true)} />;
 }

 if (activeTab === 'dashboard') {
 return (
 <div className="space-y-6">
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
 <RoleMetricCard label="Local inventory" value={centerInventory.length} detail="Units held at this blood center" icon={Droplet} tone="neutral" status="Tracked" />
 <RoleMetricCard label="Processing queue" value={processingQueue.length} detail="Collected units awaiting disposition" icon={Activity} tone="attention" status="Process" />
 <RoleMetricCard label="Release-ready units" value={dispatchReadyUnits.length} detail="Cleared units available for allocation" icon={ShieldCheck} tone="positive" status="Ready" />
 <RoleMetricCard label="Pending allocations" value={fulfillmentQueue.length} detail="Network requests needing action" icon={ClipboardList} tone={fulfillmentQueue.length > 0 ? 'attention' : 'positive'} status={fulfillmentQueue.length > 0 ? 'Review' : 'Clear'} />
 </div>

 <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
 <div className="flex flex-col gap-3 border-b border-slate-800 bg-slate-950/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <h3 className="text-sm font-bold text-white">Network fulfillment demand</h3>
 <p className="mt-1 text-xs text-slate-400">Requested components awaiting allocation and already allocated for dispatch by this center.</p>
 </div>
 <span className="font-mono text-xs text-slate-400">{formatNumber(fulfillmentQueue.length)} open requests</span>
 </div>
 <div className="h-72 px-2 py-4 sm:px-5">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={demandByComponent} margin={{ top: 6, right: 18, bottom: 4, left: 0 }}>
 <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
 <XAxis dataKey="component" tick={{ fill: 'var(--chart-axis)', fontSize: 11 }} axisLine={false} tickLine={false} />
 <YAxis allowDecimals={false} tick={{ fill: 'var(--chart-axis)', fontSize: 11 }} axisLine={false} tickLine={false} />
 <Tooltip cursor={{ fill: 'var(--chart-cursor)' }} contentStyle={{ backgroundColor: 'var(--chart-tooltip)', border: '1px solid var(--chart-tooltip-border)', borderRadius: '10px', color: 'var(--chart-tooltip-foreground)', fontSize: 12 }} labelStyle={{ color: 'var(--chart-tooltip-foreground)', fontWeight: 700 }} itemStyle={{ color: 'var(--chart-axis-strong)' }} formatter={(value: number) => [formatNumber(value), 'Units']} />
 <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: 'var(--chart-axis)', paddingTop: 12 }} />
 <Bar dataKey="pending" name="Awaiting allocation" fill="#fbbf24" radius={[6, 6, 0, 0]} />
 <Bar dataKey="allocated" name="Allocated / dispatching" fill="#22d3ee" radius={[6, 6, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </section>

 <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
 <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
 <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
 <div>
 <h3 className="text-sm font-bold text-white">Fulfillment work queue</h3>
 <p className="mt-1 text-xs leading-relaxed text-slate-400">Incoming facility requisitions that need review, allocation, or dispatch.</p>
 </div>
 <ClipboardList className="size-5 shrink-0 text-amber-300" />
 </div>
 <div className="mt-3 grid gap-2">
 {fulfillmentQueue.length === 0 ? <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/50 px-5 py-6 text-center"><CheckCircle2 className="size-7 text-emerald-400" /><p className="mt-3 text-sm font-bold text-slate-200">No requests need allocation</p><p className="mt-1 text-xs leading-relaxed text-slate-500">New blood-bank and station requisitions will appear here for fulfillment.</p></div> : fulfillmentQueue.slice(0, 5).map(request => <div key={request.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-3 py-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-cyan-900/70 bg-cyan-950/40 text-cyan-300"><Send className="size-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-mono text-xs font-bold text-white">{request.id}</p><span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${getStatusBadge(request.status)}`}>{request.status}</span></div><p className="mt-1 truncate text-xs text-slate-300">{request.requestingFacilityName}</p><p className="mt-1 text-[10px] text-slate-500">{request.items.map(item => `${formatNumber(item.quantityRequested)} ${item.requiredBloodType} ${getComponentLabel(item.requiredComponent)}`).join(' · ')}</p></div></div>)}
 </div>
 </section>

 <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
 <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
 <div>
 <h3 className="text-sm font-bold text-white">Dispatch readiness</h3>
 <p className="mt-1 text-xs leading-relaxed text-slate-400">Current center stock posture for network fulfillment.</p>
 </div>
 <PackageCheck className="size-5 shrink-0 text-cyan-300" />
 </div>
 <div className="mt-4 grid gap-3">
 <div className="flex items-center justify-between rounded-xl border border-emerald-900/60 bg-emerald-950/20 px-3 py-3"><div><p className="text-xs font-bold text-slate-200">Available for allocation</p><p className="mt-1 text-[10px] text-slate-500">Cleared inventory ready for a request</p></div><span className="font-mono text-xl font-black text-emerald-400">{formatNumber(dispatchReadyUnits.length)}</span></div>
 <div className="flex items-center justify-between rounded-xl border border-amber-900/60 bg-amber-950/20 px-3 py-3"><div><p className="text-xs font-bold text-slate-200">Reserved for fulfillment</p><p className="mt-1 text-[10px] text-slate-500">Units committed to active requests</p></div><span className="font-mono text-xl font-black text-amber-300">{formatNumber(reservedForDispatch)}</span></div>
 <div className="flex items-center justify-between rounded-xl border border-cyan-900/60 bg-cyan-950/20 px-3 py-3"><div><p className="text-xs font-bold text-slate-200">In transit</p><p className="mt-1 text-[10px] text-slate-500">Units currently en route to facilities</p></div><span className="font-mono text-xl font-black text-cyan-300">{formatNumber(inTransitUnits)}</span></div>
 </div>
 </section>
 </div>

 <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[0.85fr_1.15fr]">
 <NearlyExpiringUnitsPanel units={centerClearedUnits} facilityId={user?.facilityCode} onSelectUnit={setSelectedUnit} />
 <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
 <div className="flex items-start justify-between gap-3 border-b border-slate-800 bg-slate-950/50 px-5 py-4">
 <div>
 <h3 className="text-sm font-bold text-white">Allocation-ready products</h3>
 <p className="mt-1 text-xs leading-relaxed text-slate-400">Cleared, available stock by blood component for the next fulfillment decision.</p>
 </div>
 <PackageCheck className="size-5 shrink-0 text-emerald-400" />
 </div>
 <div className="grid gap-3 p-5 sm:grid-cols-2">
 {dispatchableByComponent.map(item => <div key={item.component} className="rounded-xl border border-slate-800 bg-slate-950 p-3.5"><div className="flex items-start justify-between gap-3"><p className="text-xs font-bold text-slate-200">{item.component}</p><span className="font-mono text-lg font-black text-emerald-400">{formatNumber(item.count)}</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(4, (item.count / dispatchableStockPeak) * 100)}%` }} /></div><p className="mt-2 text-[10px] text-slate-500">Available for allocation</p></div>)}
 </div>
 </section>
 </div>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 
 <RoleDashboardHero
 role="BLOOD CENTER"
 title="National Metro Processing Hub"
 description="Manage collection intake, infectious-screening clearance, component preparation, and regional replenishment from a single operational view."
 focus="Collection throughput and safe release"
 actions={<>
 <Button variant="ghost" size="none"
 onClick={() => setShowExcelModal(true)}
 className="flex items-center gap-2 rounded-xl border border-emerald-800/80 bg-emerald-950/80 px-4 py-2.5 text-xs font-bold text-emerald-200 transition-colors hover:bg-emerald-900 active:translate-y-px"
 >
 <FileSpreadsheet className="size-4 text-emerald-400" /> Upload collections
 </Button>
 <Button variant="ghost" size="none"
 onClick={() => setShowAddDriveModal(true)}
 className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-100 transition-colors hover:bg-slate-700 active:translate-y-px"
 >
 <Calendar className="size-4 text-primary" /> Schedule drive
 </Button>
 <Button variant="ghost" size="none"
 onClick={() => setShowAddUnitModal(true)}
 className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary active:translate-y-px"
 >
 <Plus className="size-4" /> Process unit
 </Button>
 </>}
 />

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <RoleMetricCard label="Units in network" value={totalUnitsCollected} detail="Collected and tracked units" icon={Droplet} tone="neutral" status="Live inventory" />
 <RoleMetricCard label="Screening queue" value={inTestingCount} detail="Units awaiting clearance" icon={FlaskConical} tone="attention" status="Review" />
 <RoleMetricCard label="Cleared units" value={passedUnitsCount} detail={`${screeningPassRate}% of tracked units`} icon={ShieldCheck} tone="positive" status="Release-ready" />
 <RoleMetricCard label="Active drives" value={activeDrives.length} detail="Mobile collection teams today" icon={Calendar} tone="critical" status="Field ops" />
 </div>

 <NetworkInventoryDashboardPanel />

 {/* Main Center Sections Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

 {/* Column 1 & 2: Mobile Donor Drives & Processing Queue */}
 <div className="lg:col-span-2 space-y-6">
 
 {/* Active Donor Drives Card */}
 <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
 <div className="flex items-center justify-between border-b border-slate-800 pb-3">
 <div className="flex items-center gap-2">
 <Calendar className="w-5 h-5 text-primary" />
 <h3 className="font-bold text-sm text-white">Mobile Donor Collection Drives</h3>
 </div>
 <Button variant="ghost" size="none"
 onClick={() => setShowAddDriveModal(true)}
 className="text-xs text-primary hover:underline font-semibold"
 >
 + Schedule Drive
 </Button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {donorDrives.map((drive) => {
 const pct = Math.min(100, Math.round((drive.collectedUnits / drive.targetUnits) * 100));
 return (
 <div key={drive.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
 <div className="flex items-start justify-between">
 <div>
 <span className="text-[10px] font-bold uppercase text-primary">{drive.status}</span>
 <h4 className="font-bold text-xs text-white mt-0.5">{drive.title}</h4>
 </div>
 <span className="text-[10px] font-mono text-slate-400">{drive.date}</span>
 </div>

 <p className="text-[11px] text-slate-400 flex items-center gap-1">
 <Users className="w-3.5 h-3.5 text-slate-500" />
 <span>{drive.location}</span>
 </p>

 <div className="space-y-1 pt-1">
 <div className="flex justify-between text-[10px]">
 <span className="text-slate-400">Units Collected</span>
 <span className="font-mono font-bold text-white">{drive.collectedUnits} / {drive.targetUnits}</span>
 </div>
 <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
 <div className="h-full bg-gradient-to-r from-primary to-primary rounded-full" style={{ width: `${pct}%` }} />
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Viral Marker Screening Queue */}
 <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
 <div className="flex items-center justify-between border-b border-slate-800 pb-3">
 <div className="flex items-center gap-2">
 <FlaskConical className="w-5 h-5 text-amber-400" />
 <h3 className="font-bold text-sm text-white">Laboratory Testing & Viral Marker Clearance</h3>
 </div>
 <span className="text-xs text-slate-400 font-mono">NAT & Serology Standard</span>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
 <tr>
 <th className="py-2 px-3">DIN Ref</th>
 <th className="py-2 px-3">Group</th>
 <th className="py-2 px-3">Component</th>
 <th className="py-2 px-3">HIV / HBV / HCV</th>
 <th className="py-2 px-3">Lab Status</th>
 <th className="py-2 px-3 text-right">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-800/60 font-medium">
 {bloodUnits.slice(0, 5).map((unit) => (
 <tr key={unit.id} className="hover:bg-slate-800/40">
 <td className="py-2.5 px-3 font-mono font-bold text-white">{unit.id}</td>
 <td className="py-2.5 px-3">
 <span className="font-bold text-primary">{unit.bloodType}</span>
 </td>
 <td className="py-2.5 px-3 text-slate-300">{unit.component.split('(')[0]}</td>
 <td className="py-2.5 px-3">
 <div className="flex items-center gap-1 text-[10px]">
 <span className="px-1 bg-emerald-950 text-emerald-300 rounded">HIV: {unit.testingStatus.hiv}</span>
 <span className="px-1 bg-emerald-950 text-emerald-300 rounded">HBV: {unit.testingStatus.hbv}</span>
 </div>
 </td>
 <td className="py-2.5 px-3">
 <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
 unit.testingStatus.overall === 'Passed' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
 }`}>
 {unit.testingStatus.overall}
 </span>
 </td>
 <td className="py-2.5 px-3 text-right">
 <Button variant="ghost" size="none"
 onClick={() => setSelectedUnit(unit)}
 className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-semibold"
 >
 View Certificate
 </Button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 </div>

 {/* Column 3: Component Yield Breakdown & Distribution Network */}
 <div className="space-y-6">

 <NearlyExpiringUnitsPanel units={centerClearedUnits} facilityId={user?.facilityCode} onSelectUnit={setSelectedUnit} />
 
 {/* Component Separation Yield */}
 <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
 <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
 <Layers className="w-5 h-5 text-primary" />
 <h3 className="font-bold text-sm text-white">Component Separation Yield</h3>
 </div>

 <div className="space-y-3 text-xs">
 {[
 { name: 'Packed Red Cells (PRBC)', ratio: '42%', count: bloodUnits.filter(u => u.component.includes('PRBC')).length, color: 'bg-primary' },
 { name: 'Fresh Frozen Plasma (FFP)', ratio: '28%', count: bloodUnits.filter(u => u.component.includes('FFP')).length, color: 'bg-amber-500' },
 { name: 'Platelet Concentrate', ratio: '18%', count: bloodUnits.filter(u => u.component.includes('Platelet')).length, color: 'bg-cyan-500' },
 { name: 'Cryoprecipitate', ratio: '12%', count: bloodUnits.filter(u => u.component.includes('Cryo')).length, color: 'bg-purple-500' }
 ].map((item, i) => (
 <div key={i} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
 <div className="flex justify-between items-center">
 <span className="font-bold text-slate-200">{item.name}</span>
 <span className="font-mono text-white font-bold">{formatNumber(item.count)} units</span>
 </div>
 <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
 <div className={`h-full ${item.color} rounded-full`} style={{ width: item.ratio }} />
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Connected Blood Banks Network */}
 <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
 <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
 <Building2 className="w-5 h-5 text-emerald-400" />
 <h3 className="font-bold text-sm text-white">Dispatched Blood Banks</h3>
 </div>

 <div className="space-y-2 text-xs">
 <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
 <div>
 <h4 className="font-bold text-white">BICOL REGIONAL HOSPITAL AND MEDICAL CENTER</h4>
 <p className="text-[10px] text-slate-400">License #BB-STJUDE-04</p>
 </div>
 <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold text-[10px]">ACTIVE</span>
 </div>

 <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
 <div>
 <h4 className="font-bold text-white">East Medical Center Bank</h4>
 <p className="text-[10px] text-slate-400">License #BB-EAST-02</p>
 </div>
 <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold text-[10px]">ACTIVE</span>
 </div>
 </div>
 </div>

 </div>

 </div>

 {/* Modal for Process Blood Unit for Inventory */}
 <ProcessBloodModal
 isOpen={showAddUnitModal}
 onClose={() => setShowAddUnitModal(false)}
 />

 {/* Modal for Launch Donor Drive */}
 {showAddDriveModal && (
 <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 text-slate-100 space-y-4">
 <div className="flex items-center justify-between border-b border-slate-800 pb-3">
 <h3 className="font-bold text-base text-white">Schedule Mobile Phlebotomy Drive</h3>
 <Button variant="ghost" size="none" onClick={() => setShowAddDriveModal(false)} className="text-slate-400 hover:text-white">✕</Button>
 </div>

 <form onSubmit={handleCreateDrive} className="space-y-3 text-xs">
 <div>
 <label className="block text-slate-300 font-semibold mb-1">Drive Event Title</label>
 <Input
 type="text"
 required
 value={driveTitle}
 onChange={(e) => setDriveTitle(e.target.value)}
 className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
 />
 </div>

 <div>
 <label className="block text-slate-300 font-semibold mb-1">Location Venue</label>
 <Input
 type="text"
 required
 value={driveLocation}
 onChange={(e) => setDriveLocation(e.target.value)}
 className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
 />
 </div>

 <div>
 <label className="block text-slate-300 font-semibold mb-1">Target Units Goal</label>
 <Input
 type="number"
 required
 value={targetUnits}
 onChange={(e) => setTargetUnits(Number(e.target.value))}
 className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
 />
 </div>

 <div className="pt-2 flex justify-end gap-2">
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => setShowAddDriveModal(false)}
 className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
 >
 Cancel
 </Button>
 <Button variant="ghost" size="none"
 type="submit"
 className="px-5 py-2 bg-primary text-white font-bold rounded-lg "
 >
 Publish Drive
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

 {/* Excel Batch Upload Modal */}
 <ExcelBatchUploadModal
 isOpen={showExcelModal}
 onClose={() => setShowExcelModal(false)}
 />

 </div>
 );
};

interface ApprovalRequestModalProps {
 request: RequisitionOrder;
 bloodUnits: BloodUnit[];
 providedQuantities: Record<string, number>;
 remark: string;
 onClose: () => void;
 onQuantityChange: (itemId: string, quantity: number) => void;
 onRemarkChange: (remark: string) => void;
 onApprove: () => void;
}

const ApprovalRequestModal: React.FC<ApprovalRequestModalProps> = ({
 request,
 bloodUnits,
 providedQuantities,
 remark,
 onClose,
 onQuantityChange,
 onRemarkChange,
 onApprove,
}) => {
 const approvalItems = request.items.map(item => {
 const stock = prioritizeUnitsForRelease(bloodUnits.filter(unit =>
 unit.bloodType === item.requiredBloodType
 && unit.component === item.requiredComponent
 && unit.status === 'Available'
 && unit.testingStatus.overall === 'Passed'
 && unit.currentLocation.role === 'blood_center'
 )).length;
 const selectedQuantity = Math.min(providedQuantities[item.id] ?? item.quantityRequested, item.quantityRequested);
 const dispatchQuantity = Math.min(selectedQuantity, stock);

 return { item, stock, selectedQuantity, dispatchQuantity };
 });
 const hasShortfall = approvalItems.some(({ item, selectedQuantity }) => selectedQuantity < item.quantityRequested);

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
 <div role="dialog" aria-modal="true" aria-labelledby="approval-request-title" className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 ">
 <div className="flex items-start justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
 <div>
 <p className="font-mono text-[10px] font-bold text-primary">{request.id}</p>
 <h3 id="approval-request-title" className="mt-1 text-base font-bold text-white">Review requisition approval</h3>
 <p className="mt-1 text-xs text-slate-400">Set the quantity to dispatch for {request.requestingFacilityName}. Stock is checked before dispatch.</p>
 </div>
 <Button variant="ghost" size="none" type="button" onClick={onClose} aria-label="Close approval dialog" className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"><X className="size-4" /></Button>
 </div>

 <div className="flex-1 overflow-y-auto p-6">
 <div className="flex flex-col gap-3">
 {approvalItems.map(({ item, stock, selectedQuantity, dispatchQuantity }) => (
 <div key={item.id} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
 <div>
 <div className="flex items-center gap-2"><span className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${getBloodGroupBadgeColor(item.requiredBloodType)}`}>{item.requiredBloodType}</span><span className="text-sm font-semibold text-white">{item.requiredComponent}</span></div>
 <p className="mt-2 text-xs text-slate-400">Requested <strong className="text-white">{item.quantityRequested}</strong> · Available <strong className={stock < item.quantityRequested ? 'text-amber-400' : 'text-emerald-400'}>{stock}</strong> · Dispatching <strong className={dispatchQuantity < item.quantityRequested ? 'text-amber-400' : 'text-emerald-400'}>{dispatchQuantity}</strong></p>
 </div>
 <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Approve units<Input type="number" min={0} max={item.quantityRequested} value={selectedQuantity} onChange={event => onQuantityChange(item.id, Math.min(item.quantityRequested, Math.max(0, Number(event.target.value) || 0)))} className="w-24 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-center font-mono text-sm font-bold text-white outline-none focus:border-primary" /></label>
 </div>
 ))}
 </div>

 {hasShortfall && (
 <label className="mt-5 block rounded-xl border border-amber-800/70 bg-amber-950/30 p-4 text-xs text-amber-100">
 <span className="mb-1 block font-bold text-amber-300">Partial fulfillment remarks required</span>
 <span className="mb-3 block text-amber-200/80">Explain why the requested quantity cannot be fully supplied. This will be visible to the requestor.</span>
 <textarea value={remark} onChange={event => onRemarkChange(event.target.value)} placeholder="For example: Five units are currently available; the remaining units are awaiting screening." rows={3} className="w-full resize-none rounded-lg border border-amber-900 bg-slate-950 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-500" />
 </label>
 )}
 </div>

 <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-6 py-4"><span className="text-xs text-slate-400">{hasShortfall ? 'A reason is required before partial dispatch.' : 'All requested units can be fulfilled.'}</span><div className="flex gap-2"><Button variant="ghost" size="none" type="button" onClick={onClose} className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-700">Cancel</Button><Button variant="ghost" size="none" type="button" onClick={onApprove} disabled={hasShortfall && !remark.trim()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-45"><Truck className="size-4" /> Approve & Dispatch</Button></div></div>
 </div>
 </div>
 );
};
