import { Button } from '../ui/button';
import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Send } from 'lucide-react';
import { RequisitionOrder } from '../../types/blood';
import { formatNumber, getStatusBadge } from '../../lib/utils';
import { getComponentLabel } from '../../lib/bloodCatalog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../ui/empty';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '../ui/pagination';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

type IncomingRequisitionFilter = 'pending' | 'in_transit' | 'received';

interface IncomingRequisitionsPanelProps {
 requests: RequisitionOrder[];
 onReviewDispatch: (requestId: string) => void;
 facilityLabel: 'blood bank' | 'blood station';
}

const filterLabels: Record<IncomingRequisitionFilter, string> = {
 pending: 'Pending approval',
 in_transit: 'In transit',
 received: 'Received',
};

const requestMatchesFilter = (request: RequisitionOrder, filter: IncomingRequisitionFilter) => {
 if (filter === 'pending') return ['Pending Approval', 'Cross-Matching', 'Approved & Allocated'].includes(request.status);
 if (filter === 'in_transit') return request.status === 'In Transit';
 return ['Received at Facility', 'Completed'].includes(request.status);
};

export const IncomingRequisitionsPanel: React.FC<IncomingRequisitionsPanelProps> = ({ requests, onReviewDispatch, facilityLabel }) => {
 const [filter, setFilter] = useState<IncomingRequisitionFilter>('pending');
 const [page, setPage] = useState(1);
 const pageSize = 5;
 const filteredRequests = useMemo(() => requests.filter(request => requestMatchesFilter(request, filter)), [filter, requests]);
 const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
 const activePage = Math.min(page, totalPages);
 const visibleRequests = filteredRequests.slice((activePage - 1) * pageSize, activePage * pageSize);
 const firstRecord = filteredRequests.length === 0 ? 0 : ((activePage - 1) * pageSize) + 1;
 const lastRecord = Math.min(activePage * pageSize, filteredRequests.length);

 useEffect(() => setPage(1), [filter, requests.length]);

 return (
 <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
 <div className="flex flex-col gap-4 border-b border-slate-800 bg-slate-950/50 px-5 py-4">
 <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <h2 className="text-sm font-bold text-white">Incoming requisitions</h2>
 <p className="mt-1 text-xs text-slate-400">Review local stock before dispatching requests addressed to this {facilityLabel}.</p>
 </div>
 <span className="font-mono text-xs text-amber-300">{formatNumber(requests.length)} requests</span>
 </div>
 <Tabs value={filter} onValueChange={value => setFilter(value as IncomingRequisitionFilter)}>
 <TabsList variant="line">
 {(Object.keys(filterLabels) as IncomingRequisitionFilter[]).map(value => <TabsTrigger key={value} value={value}>{filterLabels[value]} ({formatNumber(requests.filter(request => requestMatchesFilter(request, value)).length)})</TabsTrigger>)}
 </TabsList>
 </Tabs>
 </div>

 <div className="grid gap-3 p-5">
 {visibleRequests.length === 0 ? (
 <Empty className="min-h-40 border border-dashed border-slate-700 bg-slate-950/50">
 <EmptyHeader>
 <EmptyMedia variant="icon"><ClipboardList /></EmptyMedia>
 <EmptyTitle>No {filterLabels[filter].toLowerCase()} requisitions</EmptyTitle>
 <EmptyDescription>Requests matching this status will appear here.</EmptyDescription>
 </EmptyHeader>
 </Empty>
 ) : visibleRequests.map(request => {
 const dispatchable = ['Pending Approval', 'Cross-Matching', 'Approved & Allocated'].includes(request.status) && request.items.some(item => item.allocatedUnitIds.length > 0);
 const requestedUnits = request.items.reduce((total, item) => total + item.quantityRequested, 0);
 return <div key={request.id} className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-white">{request.id}</span><span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${getStatusBadge(request.status)}`}>{request.status}</span></div><p className="mt-2 text-sm font-bold text-slate-200">{request.requestingFacilityName}</p><p className="mt-1 text-[11px] text-slate-400">{request.items.map(item => `${formatNumber(item.quantityRequested)} ${item.requiredBloodType} ${getComponentLabel(item.requiredComponent)}`).join(' · ')}</p></div><div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end"><span className="font-mono text-xs text-slate-400">{formatNumber(requestedUnits)} units</span>{dispatchable ? <Button variant="ghost" size="none" type="button" onClick={() => onReviewDispatch(request.id)} className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-cyan-700"><Send className="size-3.5" /> Review & dispatch</Button> : <span className="text-[10px] text-slate-500">{request.status === 'In Transit' ? 'Awaiting facility receipt' : 'No dispatch action available'}</span>}</div></div>;
 })}
 </div>

 <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-800 bg-slate-950 px-5 py-3 text-xs text-slate-400 sm:flex-row">
 <span className="font-mono">Showing {formatNumber(firstRecord)}–{formatNumber(lastRecord)} of {formatNumber(filteredRequests.length)}</span>
 <Pagination className="mx-0 w-auto">
 <PaginationContent>
 <PaginationItem><PaginationPrevious href="#" aria-disabled={activePage === 1} className={activePage === 1 ? 'pointer-events-none opacity-50' : undefined} onClick={event => { event.preventDefault(); setPage(current => Math.max(1, current - 1)); }} /></PaginationItem>
 <PaginationItem><span className="px-2 font-mono text-xs">{formatNumber(activePage)} / {formatNumber(totalPages)}</span></PaginationItem>
 <PaginationItem><PaginationNext href="#" aria-disabled={activePage === totalPages} className={activePage === totalPages ? 'pointer-events-none opacity-50' : undefined} onClick={event => { event.preventDefault(); setPage(current => Math.min(totalPages, current + 1)); }} /></PaginationItem>
 </PaginationContent>
 </Pagination>
 </div>
 </section>
 );
};
