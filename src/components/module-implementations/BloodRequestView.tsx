import { Button } from '../ui/button';
import React, { useState } from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../ui/empty';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '../ui/pagination';
import { 
 ClipboardList, 
 Send, 
 Truck, 
 CheckCircle2, 
 Clock, 
 ArrowUpDown,
 Ban,
} from 'lucide-react';
import { useBloodData } from '../../context/BloodDataContext';
import { useAuth } from '../../context/AuthContext';
import { formatNumber, getStatusBadge, getBloodGroupBadgeColor } from '../../lib/utils';
import { getPaginationTokens } from '../../lib/pagination';
import { ConfirmBloodReceiptAlertDialog } from '../modules/ConfirmBloodReceiptAlertDialog';
import { CancelRequisitionAlertDialog } from '../modules/CancelRequisitionAlertDialog';

interface BloodRequestViewProps {
 onRequestBlood: () => void;
 incomingRequisitionsPanel?: React.ReactNode;
}

type SortField = 'id' | 'status' | 'requestedAt';
type SortOrder = 'asc' | 'desc';

export const BloodRequestView: React.FC<BloodRequestViewProps> = ({ onRequestBlood, incomingRequisitionsPanel }) => {
 const { requisitions, receiveBloodRequest, cancelRequisition } = useBloodData();
 const { user } = useAuth();

 // Only show replenishment requests submitted by the logged-in blood bank.
 const bankRequests = requisitions.filter(request => request.requestingFacilityId === user?.facilityCode);

 // Stats calculation
 const totalCount = bankRequests.length;
 const pendingCount = bankRequests.filter(r => r.status === 'Pending Approval').length;
 const inTransitCount = bankRequests.filter(r => r.status === 'In Transit').length;
 const receivedCount = bankRequests.filter(r => r.status === 'Received at Facility' || r.status === 'Completed').length;

 // Sorting state
 const [sortField, setSortField] = useState<SortField>('requestedAt');
 const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

 // Pagination state
 const [currentPage, setCurrentPage] = useState(1);
 const [itemsPerPage, setItemsPerPage] = useState(10);
 const [receiptRequisitionId, setReceiptRequisitionId] = useState<string | null>(null);
 const [cancellationRequisitionId, setCancellationRequisitionId] = useState<string | null>(null);

 const receiptRequisition = bankRequests.find(request => request.id === receiptRequisitionId) ?? null;
 const cancellationRequisition = bankRequests.find(request => request.id === cancellationRequisitionId) ?? null;

 const handleSort = (field: SortField) => {
 if (sortField === field) {
 setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
 } else {
 setSortField(field);
 setSortOrder('asc');
 }
 setCurrentPage(1);
 };

 // Sort function
 const sortedRequests = [...bankRequests].sort((a, b) => {
 let comparison = 0;
 if (sortField === 'id') {
 comparison = a.id.localeCompare(b.id);
 } else if (sortField === 'status') {
 comparison = a.status.localeCompare(b.status);
 } else if (sortField === 'requestedAt') {
 comparison = a.requestedAt.localeCompare(b.requestedAt);
 }
 return sortOrder === 'asc' ? comparison : -comparison;
 });

 // Pagination slicing
 const startIndex = (currentPage - 1) * itemsPerPage;
 const paginatedRequests = sortedRequests.slice(startIndex, startIndex + itemsPerPage);
 const totalPages = Math.ceil(sortedRequests.length / itemsPerPage);

 const renderSortIndicator = (field: SortField) => {
 if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-500" />;
 return sortOrder === 'asc' ? ' ▲' : ' ▼';
 };

 return (
 <>
 <div className="space-y-6">
 
 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl ">
 <div>
 <div className="flex items-center gap-2">
 <span className="p-2 rounded-xl bg-primary text-white font-bold text-xs">BLOOD BANK</span>
 <h2 className="text-2xl font-black text-white tracking-tight">
 Blood Request Manager
 </h2>
 </div>
 <p className="text-xs text-slate-400 mt-1 max-w-xl">
 Request blood products from the National Blood Center and track delivery status.
 </p>
 </div>

 <Button variant="ghost" size="none"
 onClick={onRequestBlood}
 className="px-4 py-2.5 bg-primary hover:bg-primary text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 animate-pulse hover:animate-none"
 >
 <Send className="w-4 h-4" />
 <span>Request Blood</span>
 </Button>
 </div>

 {incomingRequisitionsPanel}

 {/* Summary Stat Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
 <div className="flex items-center justify-between text-slate-400 text-xs">
 <span>Total Requests</span>
 <ClipboardList className="w-4 h-4 text-slate-400" />
 </div>
 <div className="flex items-baseline justify-between">
 <span className="text-3xl font-black font-mono text-white">{formatNumber(totalCount)}</span>
 <span className="text-xs text-slate-400 font-bold">All Orders</span>
 </div>
 <p className="text-[11px] text-slate-400">Total requisitions filed</p>
 </div>

 <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
 <div className="flex items-center justify-between text-slate-400 text-xs">
 <span>Pending Requests</span>
 <Clock className="w-4 h-4 text-amber-400" />
 </div>
 <div className="flex items-baseline justify-between">
 <span className="text-3xl font-black font-mono text-amber-400">{formatNumber(pendingCount)}</span>
 <span className="text-xs text-amber-400 font-bold">Awaiting Dispatch</span>
 </div>
 <p className="text-[11px] text-slate-400">Pending Center processing</p>
 </div>

 <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
 <div className="flex items-center justify-between text-slate-400 text-xs">
 <span>In Transit</span>
 <Truck className="w-4 h-4 text-cyan-400" />
 </div>
 <div className="flex items-baseline justify-between">
 <span className="text-3xl font-black font-mono text-cyan-400">{formatNumber(inTransitCount)}</span>
 <span className="text-xs text-cyan-400 font-bold">In Delivery</span>
 </div>
 <p className="text-[11px] text-slate-400">Courier transit active</p>
 </div>

 <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
 <div className="flex items-center justify-between text-slate-400 text-xs">
 <span>Received</span>
 <CheckCircle2 className="w-4 h-4 text-emerald-400" />
 </div>
 <div className="flex items-baseline justify-between">
 <span className="text-3xl font-black font-mono text-emerald-400">{formatNumber(receivedCount)}</span>
 <span className="text-xs text-emerald-400 font-bold">Completed</span>
 </div>
 <p className="text-[11px] text-slate-400">Successfully stocked</p>
 </div>
 </div>

 {/* Requisition orders */}
 <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden ">
 <div className="p-4 border-b border-slate-800 flex items-center justify-between">
 <div className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-primary" /><h3 className="font-bold text-sm text-white">Requisition Orders List</h3></div>
 <span className="text-xs text-slate-400 font-mono">Showing {formatNumber(sortedRequests.length === 0 ? 0 : startIndex + 1)}–{formatNumber(Math.min(startIndex + itemsPerPage, sortedRequests.length))} of {formatNumber(sortedRequests.length)} records</span>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
 <tr>
 <th className="py-3 px-4 cursor-pointer" onClick={() => handleSort('id')}>
 <div className="flex items-center">
 Req ID {renderSortIndicator('id')}
 </div>
 </th>
 <th className="py-3 px-4">Requested Blood Products</th>
 <th className="py-3 px-4 text-center">Total Items</th>
 <th className="py-3 px-4 text-center">Total Units</th>
 <th className="py-3 px-4 cursor-pointer" onClick={() => handleSort('status')}>
 <div className="flex items-center">
 Status {renderSortIndicator('status')}
 </div>
 </th>
 <th className="py-3 px-4 cursor-pointer" onClick={() => handleSort('requestedAt')}>
 <div className="flex items-center">
 Requested Date {renderSortIndicator('requestedAt')}
 </div>
 </th>
 <th className="py-3 px-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-800/60 font-medium">
 {paginatedRequests.map((req) => {
 const totalReqQty = req.items ? req.items.reduce((s, it) => s + it.quantityRequested, 0) : req.quantityRequested || 0;
 const totalProvQty = req.items ? req.items.reduce((s, it) => s + (it.quantityProvided !== undefined ? it.quantityProvided : it.quantityRequested), 0) : req.quantityProvided || totalReqQty;

 return (
 <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
 <td className="py-3 px-4 font-mono font-bold text-white align-top">{req.id}</td>
 <td className="py-3 px-4 text-slate-300">
 <div className="space-y-2 max-w-md">
 {req.items && req.items.map((item, idx) => (
 <div key={idx} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] bg-slate-950/60 p-1.5 rounded-lg border border-slate-850">
 <span className={`px-1.5 py-0.2 text-[9px] font-bold font-mono rounded ${getBloodGroupBadgeColor(item.requiredBloodType)}`}>
 {item.requiredBloodType}
 </span>
 <span className="text-slate-350">{item.requiredComponent.split('(')[0]}</span>
 <span className="text-slate-500 font-semibold font-mono">·</span>
 <span className="font-mono text-slate-200">
 Qty: <strong className="text-white">{formatNumber(item.quantityRequested)}</strong> requested
 {item.quantityProvided !== undefined && (
 <>
 {' '}· Prov: <strong className="text-emerald-400">{item.quantityProvided}</strong>
 </>
 )}
 </span>
 </div>
 ))}
 {req.notes?.startsWith('Partial fulfillment.') && (
 <p className="rounded-lg border border-amber-900/70 bg-amber-950/25 p-2 text-[11px] text-amber-200">
 <strong className="text-amber-300">Facility remarks:</strong> {req.notes.replace('Partial fulfillment. Remarks: ', '')}
 </p>
 )}
 </div>
 </td>
 <td className="py-3 px-4 text-center font-mono text-slate-200 align-top">
 {req.items ? req.items.length : 1}
 </td>
 <td className="py-3 px-4 text-center font-mono align-top">
 <span className="text-slate-200">{totalReqQty}</span>
 {req.status !== 'Pending Approval' && (
 <span className="text-emerald-400 font-bold ml-1">/ {totalProvQty}</span>
 )}
 </td>
 <td className="py-3 px-4 align-top">
 <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(req.status)}`}>
 {req.status}
 </span>
 </td>
 <td className="py-3 px-4 font-mono text-slate-400 align-top">{req.requestedAt}</td>
 <td className="py-3 px-4 text-right align-top">
 {req.status === 'In Transit' ? (
 <Button variant="ghost" size="none"
 onClick={() => setReceiptRequisitionId(req.id)}
 className="ml-auto px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] transition-all flex items-center gap-1"
 >
 <CheckCircle2 className="w-3 h-3" />
 <span>Confirm Receipt</span>
 </Button>
 ) : ['Pending Approval', 'Cross-Matching', 'Approved & Allocated'].includes(req.status) ? (
 <Button variant="ghost" size="none"
 onClick={() => setCancellationRequisitionId(req.id)}
 className="ml-auto flex items-center gap-1 rounded-lg border border-rose-900/70 bg-rose-950/30 px-3 py-1 text-[10px] font-bold text-rose-300 transition-colors hover:bg-rose-900/60"
 >
 <Ban className="size-3" />
 <span>Cancel Request</span>
 </Button>
 ) : (
 <span className="text-[10px] text-slate-500 italic">No actions</span>
 )}
 </td>
 </tr>
 );
 })}

 {paginatedRequests.length === 0 && (
 <tr>
 <td colSpan={7} className="p-0"><Empty><EmptyHeader><EmptyMedia variant="icon"><ClipboardList /></EmptyMedia><EmptyTitle>No blood requests recorded</EmptyTitle><EmptyDescription>Create a request to begin tracking requisitions.</EmptyDescription></EmptyHeader></Empty>
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>

 {/* Pagination Footer */}
 {sortedRequests.length > 0 && (
 <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-800 bg-slate-950 px-4 py-3 text-xs text-slate-400 sm:flex-row">
 <div className="flex items-center gap-2"><label htmlFor="bank-request-rows-per-page">Rows per page</label><Select value={String(itemsPerPage)} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}><SelectTrigger id="bank-request-rows-per-page" size="sm"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{[5, 10, 25].map(size => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectGroup></SelectContent></Select></div>

 <Pagination className="ml-auto mr-0 w-auto"><PaginationContent><PaginationItem><PaginationPrevious href="#" onClick={(event) => { event.preventDefault(); setCurrentPage(page => Math.max(1, page - 1)); }} aria-disabled={currentPage === 1} /></PaginationItem>{getPaginationTokens(totalPages, currentPage).map(token => token === 'ellipsis-left' || token === 'ellipsis-right' ? <PaginationItem key={token}><PaginationEllipsis /></PaginationItem> : <PaginationItem key={token}><PaginationLink href="#" isActive={token === currentPage} onClick={(event) => { event.preventDefault(); setCurrentPage(token); }}>{token}</PaginationLink></PaginationItem>)}<PaginationItem><PaginationNext href="#" onClick={(event) => { event.preventDefault(); setCurrentPage(page => Math.min(totalPages, page + 1)); }} aria-disabled={currentPage === totalPages} /></PaginationItem></PaginationContent></Pagination>
 </div>
 )}
 </div>
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
 </>
 );
};
