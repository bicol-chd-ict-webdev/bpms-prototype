import React, { useState, useMemo } from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '../ui/pagination';
import { Button } from '../ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../ui/empty';
import { 
 Upload, 
 Download, 
 Search, 
 Plus, 
 Droplet, 
 Calendar,
 Layers,
 FlaskConical,
 X,
 ArrowDownUp,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useBloodData } from '../../context/BloodDataContext';
import {
 BLOOD_COLLECTION_TEMPLATE_FILE_NAME,
 BLOOD_COLLECTION_TEMPLATE_SHEET_NAME,
 getBloodCollectionTemplateRows,
} from '../../lib/bloodCollectionTemplate';
import { FullBloodType } from '../../types/blood';
import { ExcelBatchUploadModal } from './ExcelBatchUploadModal';
import { BulkInventoryModal } from './BulkInventoryModal';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '../ui/input-group';
import { getPaginationTokens } from '../../lib/pagination';
import { formatNumber } from '../../lib/utils';

interface BloodCollectionsViewProps {
 onOpenAddUnit?: () => void;
}

type CollectionSortColumn = 'serialNumber' | 'bloodType' | 'volume' | 'collectionDate' | 'testingStatus';
type SortDirection = 'asc' | 'desc';

export const BloodCollectionsView: React.FC<BloodCollectionsViewProps> = ({ onOpenAddUnit }) => {
 const { bloodUnits } = useBloodData();
 const collectionUnits = useMemo(
 () => bloodUnits.filter(unit => unit.status === 'Quarantine' && unit.testingStatus.overall === 'Testing In Progress'),
 [bloodUnits],
 );

 const [searchTerm, setSearchTerm] = useState('');
 const [selectedType, setSelectedType] = useState<FullBloodType | 'ALL'>('ALL');

 const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
 const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

 const [sortColumn, setSortColumn] = useState<CollectionSortColumn>('collectionDate');
 const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
 const [currentPage, setCurrentPage] = useState(1);
 const [rowsPerPage, setRowsPerPage] = useState(10);

 const bloodGroups: FullBloodType[] = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

 // Count distribution across blood groups
 const bloodTypeCounts = useMemo(() => {
 const counts: Record<string, number> = { ALL: collectionUnits.length };
 bloodGroups.forEach(bg => { counts[bg] = 0; });
 collectionUnits.forEach(unit => {
 if (counts[unit.bloodType] !== undefined) {
 counts[unit.bloodType]++;
 }
 });
 return counts;
 }, [collectionUnits, bloodGroups]);

 // Download Sample Template for Raw Collections
 const handleDownloadTemplate = () => {
 const worksheet = XLSX.utils.json_to_sheet(getBloodCollectionTemplateRows());
 const workbook = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(workbook, worksheet, BLOOD_COLLECTION_TEMPLATE_SHEET_NAME);
 XLSX.writeFile(workbook, BLOOD_COLLECTION_TEMPLATE_FILE_NAME);
 };

 // Filter raw collections
 const filteredUnits = collectionUnits.filter(u => {
 const matchesType = selectedType === 'ALL' || u.bloodType === selectedType;
 const matchesSearch = searchTerm === '' || 
 u.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
 u.donorId.toLowerCase().includes(searchTerm.toLowerCase());

 return matchesType && matchesSearch;
 });

 const sortedUnits = useMemo(() => {
 const valueFor = (unit: typeof bloodUnits[number], column: CollectionSortColumn) => {
 switch (column) {
 case 'serialNumber': return unit.id;
 case 'bloodType': return unit.bloodType;
 case 'volume': return unit.volumeMl;
 case 'collectionDate': return unit.donationDate;
 case 'testingStatus': return unit.testingStatus.overall;
 }
 };

 return [...filteredUnits].sort((left, right) => {
 const leftValue = valueFor(left, sortColumn);
 const rightValue = valueFor(right, sortColumn);
 const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
 ? leftValue - rightValue
 : String(leftValue).localeCompare(String(rightValue));

 return sortDirection === 'asc' ? comparison : -comparison;
 });
 }, [filteredUnits, sortColumn, sortDirection]);

 const totalPages = Math.max(1, Math.ceil(sortedUnits.length / rowsPerPage));
 const activePage = Math.min(currentPage, totalPages);
 const paginatedUnits = sortedUnits.slice((activePage - 1) * rowsPerPage, activePage * rowsPerPage);

 const handleSort = (column: CollectionSortColumn) => {
 if (column === sortColumn) {
 setSortDirection(direction => direction === 'asc' ? 'desc' : 'asc');
 } else {
 setSortColumn(column);
 setSortDirection('asc');
 }
 setCurrentPage(1);
 };

 const sortIndicator = (column: CollectionSortColumn) => (
 <ArrowDownUp className={`size-3 ${sortColumn === column ? 'text-white' : 'text-slate-600'}`} />
 );

 // Key Stats for Raw Collections Intake & Storage
 const totalCollections = bloodUnits.length;
 const totalVolumeLiters = bloodUnits.reduce((acc, u) => acc + u.volumeMl, 0) / 1000;
 
 const todayStr = new Date().toISOString().split('T')[0];
 const todayCollectionsCount = bloodUnits.filter(u => u.donationDate === todayStr).length;

 return (
 <div className="space-y-6">

 {/* Raw Collection Key Stats */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 
 <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
 <div className="flex items-center justify-between text-slate-400 text-xs">
 <span>Total Raw Collections</span>
 <Droplet className="w-4 h-4 text-emerald-400" />
 </div>
 <div className="flex items-baseline justify-between">
 <span className="text-3xl font-black text-white font-mono">{formatNumber(totalCollections)}</span>
 <span className="text-xs text-emerald-400 font-bold">Serialized DIN</span>
 </div>
 <p className="text-[11px] text-slate-400">Raw donor units registered</p>
 </div>

 <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
 <div className="flex items-center justify-between text-slate-400 text-xs">
 <span>Total Collected Volume</span>
 <Layers className="w-4 h-4 text-cyan-400" />
 </div>
 <div className="flex items-baseline justify-between">
 <span className="text-3xl font-black text-cyan-300 font-mono">{formatNumber(totalVolumeLiters, 1)} L</span>
 <span className="text-xs text-slate-400">In Liters</span>
 </div>
 <p className="text-[11px] text-slate-400">Aggregated raw collection volume</p>
 </div>

 <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
 <div className="flex items-center justify-between text-slate-400 text-xs">
 <span>Today's Collection Intake</span>
 <Calendar className="w-4 h-4 text-purple-400" />
 </div>
 <div className="flex items-baseline justify-between">
 <span className="text-3xl font-black text-purple-300 font-mono">{formatNumber(todayCollectionsCount)}</span>
 <span className="text-xs text-purple-400 font-bold">New Units</span>
 </div>
 <p className="text-[11px] text-slate-400">Raw collections logged today</p>
 </div>

 </div>

 {/* Search & Filter Controls */}
 <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 ">
 
 <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
 
 {/* Search bar */}
 <div className="flex-1 max-w-md">
 <InputGroup>
 <InputGroupInput value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setCurrentPage(1); }} placeholder="Search serial number (DIN) or Donor ID..." />
 <InputGroupAddon><Search /></InputGroupAddon>
 {searchTerm && <InputGroupAddon align="inline-end"><InputGroupButton size="icon-xs" aria-label="Clear search" onClick={() => setSearchTerm('')}><X /></InputGroupButton></InputGroupAddon>}
 </InputGroup>
 </div>

 {/* Action Buttons */}
 <div className="flex flex-wrap items-center gap-2.5">
 <Button variant="ghost" size="none"
 onClick={() => setIsBulkModalOpen(true)}
 className="px-4 py-2.5 bg-primary hover:bg-primary text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
 >
 <Layers className="w-4 h-4 text-white" />
 <span>Bulk Inventory Clearance</span>
 </Button>

 <Button variant="ghost" size="none"
 onClick={handleDownloadTemplate}
 className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 "
 title="Download Excel Template"
 >
 <Download className="w-3.5 h-3.5 text-emerald-400" />
 <span>Template</span>
 </Button>

 <Button variant="ghost" size="none"
 onClick={() => setIsExcelModalOpen(true)}
 className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
 >
 <Upload className="w-3.5 h-3.5" />
 <span>Upload Excel</span>
 </Button>
 </div>
 </div>

 {/* Enhanced Blood Group Selector Bar */}
 <div className="pt-2 border-t border-slate-800/80 space-y-2">
 <div className="flex items-center justify-between text-xs text-slate-400">
 <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
 <Droplet className="w-3.5 h-3.5 text-primary fill-primary/20" />
 <span>Filter by ABO / Rh Blood Group</span>
 </span>
 {selectedType !== 'ALL' && (
 <Button variant="ghost" size="none" 
 onClick={() => setSelectedType('ALL')}
 className="text-[11px] text-primary hover:text-primary font-semibold flex items-center gap-1 transition-colors cursor-pointer"
 >
 <X className="w-3 h-3" />
 <span>Reset Blood Group Filter</span>
 </Button>
 )}
 </div>

 <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-1">
 {/* ALL Option */}
 <Button variant="ghost" size="none"
 onClick={() => { setSelectedType('ALL'); setCurrentPage(1); }}
 className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
 selectedType === 'ALL'
 ? 'bg-gradient-to-r from-primary to-primary text-white ring-1 ring-primary/50 scale-[1.02]'
 : 'bg-slate-950 hover:bg-slate-800/80 text-slate-300 border border-slate-800 hover:border-slate-700'
 }`}
 >
 <span>ALL GROUPS</span>
 <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
 selectedType === 'ALL' ? 'bg-primary/80 text-primary-foreground' : 'bg-slate-900 text-slate-400'
 }`}>
 {bloodTypeCounts['ALL']}
 </span>
 </Button>

 {/* Individual Blood Group Badges */}
 {bloodGroups.map((group) => {
 const isSelected = selectedType === group;
 const count = bloodTypeCounts[group] || 0;

 return (
 <Button variant="ghost" size="none"
 key={group}
 onClick={() => { setSelectedType(isSelected ? 'ALL' : group); setCurrentPage(1); }}
 className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 group cursor-pointer ${
 isSelected
 ? 'bg-primary text-white ring-1 ring-primary/50 scale-[1.02]'
 : 'bg-slate-950 hover:bg-slate-800/90 text-slate-200 border border-slate-800 hover:border-slate-700'
 }`}
 >
 <div className="flex items-center gap-1">
 <span className="font-mono font-black text-sm">{group}</span>
 {group === 'O-' && (
 <span className="px-1 py-0.2 rounded text-[9px] bg-primary text-primary-foreground border border-primary font-sans uppercase">
 Univ
 </span>
 )}
 </div>

 <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono transition-colors ${
 isSelected 
 ? 'bg-primary/90 text-white' 
 : count > 0 
 ? 'bg-slate-900 text-emerald-400 group-hover:bg-slate-800' 
 : 'bg-slate-900/60 text-slate-600'
 }`}>
 {formatNumber(count)}
 </span>
 </Button>
 );
 })}
 </div>
 </div>

 </div>

 {/* Collections data table */}
 <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden ">
 <div className="p-4 border-b border-slate-800 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Droplet className="w-4 h-4 text-primary" />
 <h3 className="font-bold text-sm text-white">Registered Raw Collection Units</h3>
 </div>
 <span className="text-xs text-slate-400 font-mono">
 Showing {formatNumber(sortedUnits.length === 0 ? 0 : (activePage - 1) * rowsPerPage + 1)}–{formatNumber(Math.min(activePage * rowsPerPage, sortedUnits.length))} of {formatNumber(sortedUnits.length)} records
 </span>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
 <tr>
 <th className="py-3 px-4"><Button variant="ghost" size="none" type="button" onClick={() => handleSort('serialNumber')} className="flex items-center gap-1 hover:text-white">Serial Number (DIN) {sortIndicator('serialNumber')}</Button></th>
 <th className="py-3 px-4"><Button variant="ghost" size="none" type="button" onClick={() => handleSort('bloodType')} className="flex items-center gap-1 hover:text-white">Blood Group {sortIndicator('bloodType')}</Button></th>
 <th className="py-3 px-4"><Button variant="ghost" size="none" type="button" onClick={() => handleSort('volume')} className="flex items-center gap-1 hover:text-white">Volume {sortIndicator('volume')}</Button></th>
 <th className="py-3 px-4"><Button variant="ghost" size="none" type="button" onClick={() => handleSort('collectionDate')} className="flex items-center gap-1 hover:text-white">Collection Date {sortIndicator('collectionDate')}</Button></th>
 <th className="py-3 px-4"><Button variant="ghost" size="none" type="button" onClick={() => handleSort('testingStatus')} className="flex items-center gap-1 hover:text-white">Testing Status {sortIndicator('testingStatus')}</Button></th>
 <th className="py-3 px-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-800/80 font-mono">
 {paginatedUnits.length === 0 ? (
 <tr>
 <td colSpan={6} className="p-0">
 <Empty>
 <EmptyHeader>
 <EmptyMedia variant="icon"><Droplet /></EmptyMedia>
 <EmptyTitle>No collection records yet</EmptyTitle>
 <EmptyDescription>Upload the completed Excel template to begin registering raw blood collection units.</EmptyDescription>
 </EmptyHeader>
 <EmptyContent>
 <Button type="button" onClick={() => setIsExcelModalOpen(true)}><Upload data-icon="inline-start" /> Upload Excel</Button>
 </EmptyContent>
 </Empty>
 </td>
 </tr>
 ) : (
 paginatedUnits.map((unit) => {
 const isTested = unit.testingStatus.overall === 'Passed' || unit.testingStatus.overall === 'Failed';
 const isPassed = unit.testingStatus.overall === 'Passed';

 return (
 <tr key={unit.id} className="hover:bg-slate-800/50 transition-colors">
 <td className="py-3 px-4 font-bold text-white flex items-center gap-1.5">
 <span className={`w-2 h-2 rounded-full ${isPassed ? 'bg-emerald-500' : isTested ? 'bg-primary' : 'bg-amber-500 animate-pulse'}`} />
 <span>{unit.id}</span>
 </td>
 <td className="py-3 px-4">
 <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground border border-primary/60 font-bold">
 {unit.bloodType}
 </span>
 </td>
 <td className="py-3 px-4 text-slate-300">{formatNumber(unit.volumeMl)} mL</td>
 <td className="py-3 px-4 text-slate-400">{unit.donationDate}</td>
 <td className="py-3 px-4 font-sans text-xs">
 {isPassed ? (
 <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold text-[10px]">
 Cleared (Non-Reactive)
 </span>
 ) : unit.testingStatus.overall === 'Failed' ? (
 <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground border border-primary font-bold text-[10px]">
 Reactive (Discarded)
 </span>
 ) : (
 <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/80 font-bold text-[10px]">
 Pending Lab Screening
 </span>
 )}
 </td>
 <td className="py-3 px-4 text-right font-sans">
 <Button variant="ghost" size="none"
 onClick={() => setIsBulkModalOpen(true)}
 className="px-3 py-1 bg-primary hover:bg-primary text-white font-bold rounded-lg text-[11px] transition-colors flex items-center gap-1 ml-auto cursor-pointer "
 >
 <FlaskConical className="w-3 h-3" />
 <span>Bulk Clearance</span>
 </Button>
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </div>

 <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-800 bg-slate-950 px-4 py-3 text-xs text-slate-400 sm:flex-row">
 <div className="flex items-center gap-2">
 <label htmlFor="collection-rows-per-page">Rows per page</label>
 <Select value={String(rowsPerPage)} onValueChange={(value) => { setRowsPerPage(Number(value)); setCurrentPage(1); }}>
 <SelectTrigger id="collection-rows-per-page" size="sm"><SelectValue /></SelectTrigger>
 <SelectContent><SelectGroup>{[5, 10, 20, 50].map(size => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectGroup></SelectContent>
 </Select>
 </div>

 <Pagination className="ml-auto mr-0 w-auto"><PaginationContent>
 <PaginationItem><PaginationPrevious href="#" onClick={(event) => { event.preventDefault(); setCurrentPage(page => Math.max(1, page - 1)); }} aria-disabled={activePage === 1} /></PaginationItem>
 {getPaginationTokens(totalPages, activePage).map(token => token === 'ellipsis-left' || token === 'ellipsis-right' ? <PaginationItem key={token}><PaginationEllipsis /></PaginationItem> : <PaginationItem key={token}><PaginationLink href="#" isActive={token === activePage} onClick={(event) => { event.preventDefault(); setCurrentPage(token); }}>{token}</PaginationLink></PaginationItem>)}
 <PaginationItem><PaginationNext href="#" onClick={(event) => { event.preventDefault(); setCurrentPage(page => Math.min(totalPages, page + 1)); }} aria-disabled={activePage === totalPages} /></PaginationItem>
 </PaginationContent></Pagination>
 </div>
 </div>

 {/* Excel Batch Upload Modal */}
 <ExcelBatchUploadModal
 isOpen={isExcelModalOpen}
 onClose={() => setIsExcelModalOpen(false)}
 />

 {/* Bulk Inventory Modal */}
 <BulkInventoryModal
 isOpen={isBulkModalOpen}
 onClose={() => setIsBulkModalOpen(false)}
 />

 </div>
 );
};
