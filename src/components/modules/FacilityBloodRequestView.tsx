import { Button } from '../ui/button';
import React, { useMemo, useState } from 'react';
import { Ban, CheckCircle2, ClipboardList, Clock, MapPin, Send, Truck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBloodData } from '../../context/BloodDataContext';
import { formatNumber, getBloodGroupBadgeColor, getStatusBadge } from '../../lib/utils';
import { getComponentLabel } from '../../lib/bloodCatalog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../ui/empty';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '../ui/pagination';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { getPaginationTokens } from '../../lib/pagination';
import { ConfirmBloodReceiptAlertDialog } from './ConfirmBloodReceiptAlertDialog';
import { CancelRequisitionAlertDialog } from './CancelRequisitionAlertDialog';
import { FacilityRequisitionDispatchDialog } from './FacilityRequisitionDispatchDialog';
import { IncomingRequisitionsPanel } from './IncomingRequisitionsPanel';

interface FacilityBloodRequestViewProps {
 onRequestBlood: () => void;
}

export const FacilityBloodRequestView: React.FC<FacilityBloodRequestViewProps> = ({ onRequestBlood }) => {
 const { user } = useAuth();
 const { requisitions, bloodUnits, receiveBloodRequest, updateRequisitionStatus, cancelRequisition } = useBloodData();
 const [currentPage, setCurrentPage] = useState(1);
 const [rowsPerPage, setRowsPerPage] = useState(10);
 const [receiptRequisitionId, setReceiptRequisitionId] = useState<string | null>(null);
 const [cancellationRequisitionId, setCancellationRequisitionId] = useState<string | null>(null);
 const [dispatchRequisitionId, setDispatchRequisitionId] = useState<string | null>(null);
 const requests = requisitions.filter(request => request.requestingFacilityId === user?.facilityCode);
 const incomingRequests = useMemo(() => requisitions
 .filter(request => request.targetFacilityId === user?.facilityCode)
 .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt)), [requisitions, user?.facilityCode]);
 const receiptRequisition = requests.find(request => request.id === receiptRequisitionId) ?? null;
 const cancellationRequisition = requests.find(request => request.id === cancellationRequisitionId) ?? null;
 const activeCount = requests.filter(request => ['Pending Approval', 'Cross-Matching', 'Approved & Allocated', 'In Transit'].includes(request.status)).length;
 const inTransitCount = requests.filter(request => request.status === 'In Transit').length;
 const completedCount = requests.filter(request => ['Received at Facility', 'Completed'].includes(request.status)).length;
 const totalPages = Math.max(1, Math.ceil(requests.length / rowsPerPage));
 const activePage = Math.min(currentPage, totalPages);
 const firstRecord = requests.length === 0 ? 0 : ((activePage - 1) * rowsPerPage) + 1;
 const lastRecord = Math.min(activePage * rowsPerPage, requests.length);
 const paginatedRequests = requests.slice((activePage - 1) * rowsPerPage, activePage * rowsPerPage);
 const dispatchRequisition = incomingRequests.find(request => request.id === dispatchRequisitionId) ?? null;

 const dispatchIncomingRequest = (request: typeof incomingRequests[number], items: { id: string; quantityProvided: number; allocatedUnitIds: string[] }[], remarks: string) => {
 const isPartial = items.some(item => item.quantityProvided < (request.items.find(requestItem => requestItem.id === item.id)?.quantityRequested ?? 0));
 updateRequisitionStatus(
 request.id,
 'In Transit',
 isPartial ? `Partial fulfillment. Remarks: ${remarks}` : 'Request approved and dispatched from blood station.',
 undefined,
 undefined,
 items,
 );
 setDispatchRequisitionId(null);
 };

 return (
 <div className="space-y-6">
 <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 md:flex-row md:items-center md:justify-between">
 <div>
 <div className="flex items-center gap-2">
 <span className="rounded-xl bg-amber-600 p-2 text-xs font-bold text-white">BLOOD STATION FACILITY</span>
 <h2 className="text-2xl font-black tracking-tight text-white">Blood Requests</h2>
 </div>
 <p className="mt-1 max-w-2xl text-xs text-slate-400">Request products from the nearest eligible blood center, blood bank, or blood station facility.</p>
 </div>
 <Button variant="ghost" size="none" onClick={onRequestBlood} className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-primary">
 <Send className="size-4" /> Request from nearby facility
 </Button>
 </div>

 <IncomingRequisitionsPanel requests={incomingRequests} onReviewDispatch={setDispatchRequisitionId} facilityLabel="blood station" />

 <section className="hidden overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
 <div className="flex flex-col gap-3 border-b border-slate-800 bg-slate-950/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <h3 className="text-sm font-bold text-white">Incoming requisitions</h3>
 <p className="mt-1 text-xs text-slate-400">Requests from connected facilities addressed to this blood station. Reserved units can be dispatched here.</p>
 </div>
 <span className="font-mono text-xs text-amber-300">{formatNumber(incomingRequests.length)} requests</span>
 </div>
 <div className="grid gap-3 p-5">
 {incomingRequests.length === 0 ? (
 <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/50 px-5 py-6 text-center">
 <ClipboardList className="size-7 text-slate-600" />
 <p className="mt-3 text-sm font-bold text-slate-200">No incoming requisitions</p>
 <p className="mt-1 text-xs leading-relaxed text-slate-500">Requests from other blood stations and connected facilities will appear here.</p>
 </div>
 ) : incomingRequests.map(request => {
 const dispatchable = ['Pending Approval', 'Cross-Matching', 'Approved & Allocated'].includes(request.status) && request.items.some(item => item.allocatedUnitIds.length > 0);
 const unitCount = request.items.reduce((total, item) => total + item.quantityRequested, 0);

 return (
 <div key={request.id} className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between">
 <div className="min-w-0">
 <div className="flex flex-wrap items-center gap-2">
 <span className="font-mono text-xs font-bold text-white">{request.id}</span>
 <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${getStatusBadge(request.status)}`}>{request.status}</span>
 </div>
 <p className="mt-2 text-sm font-bold text-slate-200">{request.requestingFacilityName}</p>
 <p className="mt-1 text-[11px] text-slate-400">{request.items.map(item => `${formatNumber(item.quantityRequested)} ${item.requiredBloodType} ${getComponentLabel(item.requiredComponent)}`).join(' · ')}</p>
 </div>
 <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
 <span className="font-mono text-xs text-slate-400">{formatNumber(unitCount)} units</span>
 {dispatchable ? (
 <Button variant="ghost" size="none" type="button" onClick={() => setDispatchRequisitionId(request.id)} className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-cyan-700">
 <Send className="size-3.5" /> Review & dispatch
 </Button>
 ) : <span className="text-[10px] text-slate-500">{request.status === 'In Transit' ? 'Awaiting facility receipt' : 'No dispatch action available'}</span>}
 </div>
 </div>
 );
 })}
 </div>
 </section>

 <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
 <RequestMetric label="Total Requests" value={requests.length} detail="All requisitions" icon={ClipboardList} tone="text-slate-200" />
 <RequestMetric label="Active Requests" value={activeCount} detail="Pending or in fulfillment" icon={Clock} tone="text-amber-400" />
 <RequestMetric label="In Transit" value={inTransitCount} detail={`${completedCount} received or completed`} icon={Truck} tone="text-cyan-400" />
 </div>

 <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
 <div className="flex items-center justify-between border-b border-slate-800 p-4">
 <div className="flex items-center gap-2">
 <ClipboardList className="size-4 text-primary" />
 <h3 className="text-sm font-bold text-white">Requisition History</h3>
 </div>
 <span className="font-mono text-xs text-slate-400">Showing {formatNumber(firstRecord)}–{formatNumber(lastRecord)} of {formatNumber(requests.length)} records</span>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-slate-950 font-mono text-[10px] uppercase text-slate-400">
 <tr>
 <th className="px-4 py-3">Request</th>
 <th className="px-4 py-3">Products</th>
 <th className="px-4 py-3">Selected provider</th>
 <th className="px-4 py-3">Status</th>
 <th className="px-4 py-3">Submitted</th>
 <th className="px-4 py-3 text-right">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-800/60">
 {paginatedRequests.map(request => (
 <tr key={request.id} className="align-top transition-colors hover:bg-slate-800/40">
 <td className="px-4 py-3 font-mono font-bold text-white">{request.id}</td>
 <td className="px-4 py-3">
 <div className="flex flex-col gap-1.5">
 {request.items.map(item => <div key={item.id} className="flex items-center gap-2"><span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${getBloodGroupBadgeColor(item.requiredBloodType)}`}>{item.requiredBloodType}</span><span className="text-slate-300">{formatNumber(item.quantityRequested)} × {item.requiredComponent.split('(')[0]}</span></div>)}
 </div>
 </td>
 <td className="px-4 py-3 text-slate-300"><div className="flex items-start gap-1.5"><MapPin className="mt-0.5 size-3.5 shrink-0 text-cyan-400" /><span>{request.targetFacilityName}</span></div></td>
 <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-[10px] font-bold ${getStatusBadge(request.status)}`}>{request.status}</span></td>
 <td className="px-4 py-3 font-mono text-slate-400">{request.requestedAt}</td>
 <td className="px-4 py-3 text-right">
 {request.status === 'In Transit' ? (
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => setReceiptRequisitionId(request.id)}
 className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-800 bg-emerald-950/40 px-2.5 py-1.5 text-[10px] font-bold text-emerald-300 transition-colors hover:bg-emerald-900/60"
 >
 <CheckCircle2 className="size-3.5" /> Accept into inventory
 </Button>
 ) : ['Pending Approval', 'Cross-Matching', 'Approved & Allocated'].includes(request.status) ? (
 <Button variant="ghost" size="none" type="button" onClick={() => setCancellationRequisitionId(request.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-900/70 bg-rose-950/30 px-2.5 py-1.5 text-[10px] font-bold text-rose-300 transition-colors hover:bg-rose-900/60">
 <Ban className="size-3.5" /> Cancel request
 </Button>
 ) : <span className="text-slate-600">No action</span>}
 </td>
 </tr>
 ))}
 {requests.length === 0 && (
 <tr>
 <td colSpan={6} className="p-0">
 <Empty>
 <EmptyHeader>
 <EmptyMedia variant="icon"><ClipboardList /></EmptyMedia>
 <EmptyTitle>No requisitions filed</EmptyTitle>
 <EmptyDescription>Request blood products from an eligible provider to begin tracking this facility&apos;s requisitions.</EmptyDescription>
 </EmptyHeader>
 </Empty>
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-800 bg-slate-950 px-4 py-3 text-xs text-slate-400 sm:flex-row">
 <div className="flex items-center gap-2">
 <label htmlFor="facility-request-rows-per-page">Rows per page</label>
 <Select value={String(rowsPerPage)} onValueChange={value => { setRowsPerPage(Number(value)); setCurrentPage(1); }}>
 <SelectTrigger id="facility-request-rows-per-page" size="sm"><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectGroup>
 {[5, 10, 25].map(size => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
 </SelectGroup>
 </SelectContent>
 </Select>
 </div>
 <Pagination className="ml-auto mr-0 w-auto">
 <PaginationContent>
 <PaginationItem>
 <PaginationPrevious
 href="#"
 aria-disabled={activePage === 1}
 className={activePage === 1 ? 'pointer-events-none opacity-50' : undefined}
 onClick={event => { event.preventDefault(); setCurrentPage(page => Math.max(1, page - 1)); }}
 />
 </PaginationItem>
 {getPaginationTokens(totalPages, activePage).map(token => token === 'ellipsis-left' || token === 'ellipsis-right' ? (
 <PaginationItem key={token}><PaginationEllipsis /></PaginationItem>
 ) : (
 <PaginationItem key={token}>
 <PaginationLink href="#" isActive={token === activePage} onClick={event => { event.preventDefault(); setCurrentPage(token); }}>{token}</PaginationLink>
 </PaginationItem>
 ))}
 <PaginationItem>
 <PaginationNext
 href="#"
 aria-disabled={activePage === totalPages}
 className={activePage === totalPages ? 'pointer-events-none opacity-50' : undefined}
 onClick={event => { event.preventDefault(); setCurrentPage(page => Math.min(totalPages, page + 1)); }}
 />
 </PaginationItem>
 </PaginationContent>
 </Pagination>
 </div>
 <ConfirmBloodReceiptAlertDialog
 requisition={receiptRequisition}
 open={Boolean(receiptRequisition)}
 onOpenChange={open => { if (!open) setReceiptRequisitionId(null); }}
 onConfirm={requisitionId => { receiveBloodRequest(requisitionId); setReceiptRequisitionId(null); }}
 />
 <CancelRequisitionAlertDialog
 requisition={cancellationRequisition}
 open={Boolean(cancellationRequisition)}
 onOpenChange={open => { if (!open) setCancellationRequisitionId(null); }}
 onConfirm={requisitionId => {
  if (user?.facilityCode && cancelRequisition(requisitionId, user.facilityCode)) setCancellationRequisitionId(null);
 }}
 />
 <FacilityRequisitionDispatchDialog
 request={dispatchRequisition}
 facilityId={user?.facilityCode}
 bloodUnits={bloodUnits}
 onOpenChange={open => { if (!open) setDispatchRequisitionId(null); }}
 onDispatch={dispatchIncomingRequest}
 />
 </div>
 </div>
 );
};

const RequestMetric: React.FC<{ label: string; value: number; detail: string; icon: React.ElementType; tone: string }> = ({ label, value, detail, icon: Icon, tone }) => (
 <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center justify-between text-xs text-slate-400"><span>{label}</span><Icon className={`size-4 ${tone}`} /></div><div className={`mt-2 font-mono text-3xl font-black ${tone}`}>{formatNumber(value)}</div><p className="mt-1 text-[11px] text-slate-400">{detail}</p></div>
);
