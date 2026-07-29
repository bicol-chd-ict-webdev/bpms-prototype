import React, { useMemo, useState } from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '../ui/pagination';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../ui/empty';
import { 
 Droplet, 
 Filter, 
 Search, 
 Plus, 
 AlertTriangle, 
 ShieldCheck, 
 CheckCircle2,
 XCircle,
 FlaskConical,
 Layers,
 ChevronRight,
 Info,
 UserCheck,
 RotateCcw
} from 'lucide-react';
import { useBloodData } from '../../context/BloodDataContext';
import { FullBloodType, UnitStatus } from '../../types/blood';
import { formatNumber, getBloodGroupBadgeColor, getStatusBadge } from '../../lib/utils';
import { UnitDetailModal } from '../common/UnitDetailModal';
import { BulkInventoryModal } from './BulkInventoryModal';
import { useAuth } from '../../context/AuthContext';
import { BLOOD_COMPONENTS, BLOOD_GROUPS, getComponentLabel } from '../../lib/bloodCatalog';
import { getInventoryStatusOptions, getReactiveMarkers, isAvailableInventoryUnit } from '../../lib/inventory';
import { getBloodTypeStockLevel, getBloodTypeStockThresholds, isRedCellComponent } from '../../lib/bloodStockLevel';
import { daysUntilExpiry } from '../../lib/bloodRelease';
import { useInventoryTable } from '../../hooks/useInventoryTable';
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group';
import { Button } from '../ui/button';
import { ReturnBloodUnitDialog } from '../modules/ReturnBloodUnitDialog';
import { BatchReturnBloodUnitsDialog } from '../modules/BatchReturnBloodUnitsDialog';
import { ReturnedUnitReviewPanel } from '../modules/ReturnedUnitReviewPanel';
import { getPaginationTokens } from '../../lib/pagination';

interface BloodInventoryMatrixProps {
 onOpenAddUnit?: () => void;
 facilityScoped?: boolean;
}

const formatExpiryDate = (expiryDate: string) => {
 if (!expiryDate) return 'Not policy-defined';

 const date = new Date(`${expiryDate}T00:00:00Z`);
 if (Number.isNaN(date.getTime())) return 'Not available';

 return new Intl.DateTimeFormat('en-US', {
 month: 'short',
 day: 'numeric',
 year: 'numeric',
 timeZone: 'UTC',
 }).format(date);
};

const getExpiryLabel = (expiryDate: string) => {
 if (!expiryDate) return 'No shelf-life policy supplied';

 const daysLeft = daysUntilExpiry(expiryDate);

 if (daysLeft < 0) return 'Expired';
 if (daysLeft === 0) return 'Expires today';
 if (daysLeft === 1) return '1 day left';
 return `${daysLeft} days left`;
};

export const BloodInventoryMatrix: React.FC<BloodInventoryMatrixProps> = ({ onOpenAddUnit, facilityScoped = false }) => {
 const { currentRole, user } = useAuth();
 const { bloodUnits, updateUnitStatus } = useBloodData();
 const [activeUnitModal, setActiveUnitModal] = useState<string | null>(null);
 const [returningUnitId, setReturningUnitId] = useState<string | null>(null);
 const [batchReturnOpen, setBatchReturnOpen] = useState(false);
 const [showBulkModal, setShowBulkModal] = useState(false);
 const isBloodBank = currentRole === 'blood_bank';
 const isFacilityInventory = facilityScoped && currentRole === 'blood_service_facility';
 const isInventoryHolder = isBloodBank || isFacilityInventory;
 const inventoryTable = useInventoryTable(bloodUnits, currentRole, isFacilityInventory ? user?.facilityCode : undefined);
 const {
 allTestedUnits, nonReactiveUnits, reactiveUnits, sortedUnits, paginatedUnits, totalPages,
 selectedType, setSelectedType, selectedComponent, setSelectedComponent, selectedStatus, setSelectedStatus,
 testOutcomeFilter, setTestOutcomeFilter, searchTerm, setSearchTerm, currentPage, setCurrentPage,
 rowsPerPage, setRowsPerPage, sortColumn, sortDirection, handleSort, clearFilters,
 } = inventoryTable;

 const availableBankUnits = nonReactiveUnits.filter(u => u.status === 'Available');
 const availableStockUnits = nonReactiveUnits.filter(u => u.status === 'Available');
 const uncrossmatchedBankUnits = nonReactiveUnits.filter(u => u.status === 'Uncrossmatched');
 const crossmatchedBankUnits = nonReactiveUnits.filter(u => u.status === 'Crossmatched');
 const returnableBankUnits = nonReactiveUnits.filter(unit =>
 unit.currentLocation.facilityId === user?.facilityCode &&
 unit.receivedFrom &&
 ['Available', 'Uncrossmatched'].includes(unit.status)
 );
 const selectableInventoryStatuses: UnitStatus[] = ['Available', 'Uncrossmatched', 'Crossmatched'];

 const matrixAvailableUnits = useMemo(() => bloodUnits.filter(unit =>
 (!isFacilityInventory || unit.currentLocation.facilityId === user?.facilityCode)
 && isAvailableInventoryUnit(unit, currentRole)
 ), [bloodUnits, currentRole, isFacilityInventory, user?.facilityCode]);

 const matrixCounts = useMemo(() => {
 const counts = Object.fromEntries(BLOOD_GROUPS.map(group => [group, { total: 0, wholeBlood: 0, prbc: 0 }])) as Record<FullBloodType, { total: number; wholeBlood: number; prbc: number }>;

 matrixAvailableUnits.forEach(unit => {
 const count = counts[unit.bloodType];
 if (selectedComponent === 'ALL' || unit.component === selectedComponent) count.total += 1;
 if (unit.component === 'Whole Blood') count.wholeBlood += 1;
 if (unit.component === 'Packed Red Blood Cells (PRBC)') count.prbc += 1;
 });

 return counts;
 }, [matrixAvailableUnits, selectedComponent]);

 const selectedUnit = bloodUnits.find(u => u.id === activeUnitModal) || null;
 const returningUnit = bloodUnits.find(u => u.id === returningUnitId) || null;

 const clearanceRate = allTestedUnits.length > 0 
 ? ((nonReactiveUnits.length / allTestedUnits.length) * 100).toFixed(1)
 : '100.0';

 return (
 <div className="space-y-6">
 
 {/* Top Inventory Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl ">
 <div>
 <div className="flex items-center gap-2">
 <Droplet className="w-5 h-5 text-primary fill-primary" />
 <h2 className="text-xl font-bold text-white">
 {isBloodBank ? 'Blood Bank Inventory' : isFacilityInventory ? 'Facility Inventory' : 'Tested Blood Inventory'}
 </h2>
 </div>
 <p className="text-xs text-slate-400 mt-1 max-w-2xl">
 {isInventoryHolder
 ? 'Available is the default inventory status. Uncrossmatched and crossmatched units are tracked as separate statuses.'
 : 'Tracks all lab-tested blood units (Non-Reactive & Reactive). Only Non-Reactive cleared units are added to available inventory stock.'}
 </p>
 </div>

 {isInventoryHolder && (
 <Button type="button" variant="outline" onClick={() => setBatchReturnOpen(true)} disabled={returnableBankUnits.length === 0}>
 <RotateCcw data-icon="inline-start" /> Return blood units
 </Button>
 )}

 {currentRole === 'blood_center' && (
 <div className="flex items-center gap-2 shrink-0">
 <Button variant="ghost" size="none"
 onClick={() => setShowBulkModal(true)}
 className="px-4 py-2.5 bg-primary hover:bg-primary text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
 >
 <Layers className="w-4 h-4 text-white" />
 <span>Bulk Process Inventory</span>
 </Button>
 </div>
 )}
 </div>

 <ReturnedUnitReviewPanel />

 {/* Primary Tested Inventory Key Stats */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 
 <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
 <div className="flex items-center justify-between text-slate-400 text-xs">
 <span>{isInventoryHolder ? 'Available Units' : 'Available Stock'}</span>
 <ShieldCheck className="w-4 h-4 text-emerald-400" />
 </div>
 <div className="flex items-baseline justify-between">
 <span className="text-3xl font-black text-emerald-400 font-mono">
 {formatNumber(isInventoryHolder ? availableBankUnits.length : availableStockUnits.length)}
 </span>
 <span className="text-xs text-emerald-300 font-bold">
 {isInventoryHolder ? 'Default Status' : 'Ready to issue'}
 </span>
 </div>
 <p className="text-[11px] text-slate-400">
 {isInventoryHolder ? 'Reserved for the next inventory workflow' : 'Reserved units are excluded from available stock'}
 </p>
 </div>

 <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
 <div className="flex items-center justify-between text-slate-400 text-xs">
 <span>{isInventoryHolder ? 'Uncrossmatched Units' : 'Reactive Test Records'}</span>
 {isInventoryHolder ? <FlaskConical className="w-4 h-4 text-amber-400" /> : <AlertTriangle className="w-4 h-4 text-primary" />}
 </div>
 <div className="flex items-baseline justify-between">
 <span className={`text-3xl font-black font-mono ${isInventoryHolder ? 'text-amber-400' : 'text-primary'}`}>
 {formatNumber(isInventoryHolder ? uncrossmatchedBankUnits.length : reactiveUnits.length)}
 </span>
 <span className={`text-xs font-bold ${isInventoryHolder ? 'text-amber-300' : 'text-primary'}`}>
 {isInventoryHolder ? 'Awaiting Crossmatch' : 'Flagged / Quarantine'}
 </span>
 </div>
 <p className="text-[11px] text-slate-400">
 {isInventoryHolder ? 'Separate from the available default status' : 'Infectious marker positive (Excluded)'}
 </p>
 </div>

 <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
 <div className="flex items-center justify-between text-slate-400 text-xs">
 <span>{isInventoryHolder ? 'Crossmatched Units' : 'Total Tested Units'}</span>
 {isInventoryHolder ? <UserCheck className="w-4 h-4 text-violet-400" /> : <FlaskConical className="w-4 h-4 text-cyan-400" />}
 </div>
 <div className="flex items-baseline justify-between">
 <span className={`text-3xl font-black font-mono ${isInventoryHolder ? 'text-violet-400' : 'text-cyan-300'}`}>
 {formatNumber(isInventoryHolder ? crossmatchedBankUnits.length : allTestedUnits.length)}
 </span>
 <span className={`text-xs font-bold ${isInventoryHolder ? 'text-violet-300' : 'text-cyan-400'}`}>
 {isInventoryHolder ? 'Patient Held' : 'Lab Screened'}
 </span>
 </div>
 <p className="text-[11px] text-slate-400">
 {isInventoryHolder ? 'Compatibility-confirmed and held for a patient' : 'Total processed through testing'}
 </p>
 </div>

 <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
 <div className="flex items-center justify-between text-slate-400 text-xs">
 <span>{isInventoryHolder ? (isFacilityInventory ? 'Total Facility Inventory' : 'Total Bank Inventory') : 'Non-Reactive Safety Rate'}</span>
 <CheckCircle2 className="w-4 h-4 text-purple-400" />
 </div>
 <div className="flex items-baseline justify-between">
 <span className="text-3xl font-black text-purple-300 font-mono">
 {isInventoryHolder ? formatNumber(nonReactiveUnits.length) : `${clearanceRate}%`}
 </span>
 <span className="text-xs text-purple-400 font-bold">{isInventoryHolder ? 'Tested Units' : 'Passed Rate'}</span>
 </div>
 <p className="text-[11px] text-slate-400">
 {isInventoryHolder ? 'Available, uncrossmatched, and crossmatched' : 'Percentage of non-reactive test units'}
 </p>
 </div>

 </div>

 {/* Component Filter Tabs */}
 <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
 <Button variant="ghost" size="none"
 onClick={() => setSelectedComponent('ALL')}
 className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
 selectedComponent === 'ALL'
 ? 'bg-slate-100 text-slate-900 border-white font-bold'
 : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
 }`}
 >
 All Components ({formatNumber(matrixAvailableUnits.length)})
 </Button>
 {BLOOD_COMPONENTS.map((comp) => {
 const count = matrixAvailableUnits.filter(unit => unit.component === comp).length;
 return (
 <Button variant="ghost" size="none"
 key={comp}
 onClick={() => setSelectedComponent(comp)}
 className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
 selectedComponent === comp
 ? 'bg-primary text-white border-primary font-bold '
 : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
 }`}
 >
 {getComponentLabel(comp)} ({formatNumber(count)})
 </Button>
 );
 })}
 </div>

 {/* Non-Reactive Stock Matrix (8 Blood Groups) */}
 <div className="space-y-2">
 <div className="flex items-center justify-between text-xs text-slate-400 px-1">
 <span className="font-bold text-slate-300 flex items-center gap-1.5">
 <ShieldCheck className="w-4 h-4 text-emerald-400" />
 {isInventoryHolder ? 'Available Stock Matrix' : 'Non-Reactive Available Stock Matrix'}
 </span>
 <span className="text-[11px] text-slate-500">
 {selectedComponent === 'ALL' || isRedCellComponent(selectedComponent)
 ? 'Whole Blood and PRBC use their own selected-component thresholds.'
 : `No red, yellow, or green threshold is defined for ${getComponentLabel(selectedComponent)}.`}
 </span>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
 {BLOOD_GROUPS.map((group) => {
 const { total: count, wholeBlood: wbUnitsCount, prbc: prbcUnitsCount } = matrixCounts[group];

 const wbPrbcCount = wbUnitsCount + prbcUnitsCount;
 const hasPolicyThreshold = selectedComponent === 'ALL' || isRedCellComponent(selectedComponent);
 const policyCount = selectedComponent === 'ALL' ? wbPrbcCount : count;
 const statusLevel = hasPolicyThreshold ? getBloodTypeStockLevel(group, policyCount) : null;
 const { stableAt } = getBloodTypeStockThresholds(group);
 let statusLabel: string;
 let statusColor: string;
 const statusProgress = hasPolicyThreshold ? Math.min(100, Math.round((policyCount / stableAt) * 100)) : 0;

 if (!hasPolicyThreshold) {
 statusLabel = 'No policy';
 statusColor = 'text-slate-400';
 } else if (statusLevel === 'critical') {
 statusLabel = 'Critical';
 statusColor = 'text-primary';
 } else if (statusLevel === 'low') {
 statusLabel = 'Low Stock';
 statusColor = 'text-amber-400';
 } else if (statusLevel === 'unclassified') {
 statusLabel = 'Policy gap';
 statusColor = 'text-slate-400';
 } else {
 statusLabel = 'Stable';
 statusColor = 'text-emerald-400';
 }

 const isSelected = selectedType === group;
 const barBgColor = 
 !hasPolicyThreshold ? 'bg-slate-600' : statusLevel === 'critical' ? 'bg-primary' :
 statusLevel === 'low' ? 'bg-amber-500' : statusLevel === 'unclassified' ? 'bg-slate-500' : 'bg-emerald-500';

 return (
 <div
 key={group}
 onClick={() => setSelectedType(selectedType === group ? 'ALL' : group)}
 className={`min-h-[172px] p-4 rounded-2xl cursor-pointer border transition-all duration-200 flex flex-col justify-between ${
 isSelected
 ? 'bg-slate-800 border-slate-700 ring-1 ring-slate-600 '
 : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
 }`}
 >
 {/* Header Row: Blood Group Name & Status Dot */}
 <div className="flex items-center justify-between">
 <span className="text-sm font-black text-white tracking-wide">
 {group}
 </span>
 
 {/* Minimal Status Dot */}
 <div className="flex items-center gap-1.5">
 <span className={`w-2 h-2 rounded-full ${barBgColor} ${statusLevel && statusLevel !== 'stable' ? 'animate-pulse' : ''}`} />
 <span className={`text-[9px] font-bold uppercase tracking-wider ${statusColor}`}>
 {statusLabel}
 </span>
 </div>
 </div>

 {/* Middle Row: Large Stat Number */}
 <div className="my-1">
 <div className="text-3xl font-light text-white font-mono leading-none">
 {formatNumber(count)}
 </div>
 <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">
 Units
 </div>
 </div>

 {/* Bottom Row: Policy progress where a policy exists */}
 <div className="space-y-2">
 <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
 <div 
 className={`h-full rounded-full transition-all duration-300 ${barBgColor}`} 
 style={{ width: `${statusProgress}%` }}
 />
 </div>

 <p className="border-t border-slate-800/60 pt-1.5 text-[10px] leading-snug text-slate-400">
 {hasPolicyThreshold
 ? `${formatNumber(policyCount)} ${selectedComponent === 'ALL' ? 'Whole Blood + PRBC' : getComponentLabel(selectedComponent)} units determine this status.`
 : `${formatNumber(count)} ${getComponentLabel(selectedComponent)} units available. No policy threshold applies.`}
 </p>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Filter and Search Bar */}
 <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
 
 {/* Test Result Filter Pills */}
 <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-800">
 <span className="text-xs text-slate-400 font-medium mr-1">Filter Test Result:</span>
 
 <Button variant="ghost" size="none"
 onClick={() => setTestOutcomeFilter('ALL')}
 className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
 testOutcomeFilter === 'ALL'
 ? 'bg-slate-700 text-white border border-slate-600'
 : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
 }`}
 >
 All Tested ({formatNumber(allTestedUnits.length)})
 </Button>

 <Button variant="ghost" size="none"
 onClick={() => setTestOutcomeFilter('NON_REACTIVE')}
 aria-pressed={testOutcomeFilter === 'NON_REACTIVE'}
 className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
 testOutcomeFilter === 'NON_REACTIVE'
 ? 'bg-emerald-600 text-white border border-emerald-600 shadow-sm'
 : 'bg-slate-950 text-emerald-400 hover:bg-emerald-950/40 border border-emerald-900/60'
 }`}
 >
 <CheckCircle2 className="w-3.5 h-3.5" />
 <span>Non-Reactive Stock ({formatNumber(nonReactiveUnits.length)})</span>
 </Button>

 <Button variant="ghost" size="none"
 onClick={() => setTestOutcomeFilter('REACTIVE')}
 aria-pressed={testOutcomeFilter === 'REACTIVE'}
 className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
 testOutcomeFilter === 'REACTIVE'
 ? 'bg-primary text-primary-foreground border border-primary shadow-sm'
 : 'bg-slate-950 text-primary hover:bg-primary/40 border border-primary/60'
 }`}
 >
 <AlertTriangle className="w-3.5 h-3.5" />
 <span>Reactive / Failed Records ({formatNumber(reactiveUnits.length)})</span>
 </Button>
 </div>

 <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs pt-1">
 
 <div className="flex-1 w-full">
 <InputGroup>
 <InputGroupInput placeholder="Search DIN #, donor ref, or facility name..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
 <InputGroupAddon><Search /></InputGroupAddon>
 </InputGroup>
 </div>

 <div className="flex items-center gap-2 w-full sm:w-auto">
 <Filter className="w-4 h-4 text-slate-400 shrink-0" />
 <Select
 value={selectedStatus}
 onValueChange={(value) => setSelectedStatus(value as UnitStatus | 'ALL')}
 >
 <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="All Statuses" /></SelectTrigger>
 <SelectContent><SelectGroup>
 <SelectItem value="ALL">All Statuses</SelectItem>
 {getInventoryStatusOptions(currentRole).map(status => (
 <SelectItem key={status} value={status}>
 {status === 'Crossmatched' ? 'Crossmatched (Patient Held)' : status}
 </SelectItem>
 ))}
 </SelectGroup></SelectContent>
 </Select>
 </div>

 </div>

 {/* Active filter pills */}
 {(selectedType !== 'ALL' || selectedComponent !== 'ALL' || selectedStatus !== 'ALL' || testOutcomeFilter !== 'ALL') && (
 <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
 <span>Active Filters:</span>
 {testOutcomeFilter !== 'ALL' && (
 <span className="bg-slate-800 text-white px-2 py-0.5 rounded-full border border-slate-700">
 Outcome: {testOutcomeFilter === 'NON_REACTIVE' ? 'Non-Reactive' : 'Reactive'}
 </span>
 )}
 {selectedType !== 'ALL' && (
 <span className="bg-slate-800 text-white px-2 py-0.5 rounded-full border border-slate-700">
 Group: {selectedType}
 </span>
 )}
 {selectedComponent !== 'ALL' && (
 <span className="bg-slate-800 text-white px-2 py-0.5 rounded-full border border-slate-700">
 Component: {getComponentLabel(selectedComponent)}
 </span>
 )}
 {selectedStatus !== 'ALL' && (
 <span className="bg-slate-800 text-white px-2 py-0.5 rounded-full border border-slate-700">
 Status: {selectedStatus}
 </span>
 )}
 <Button variant="ghost" size="none"
 onClick={clearFilters}
 className="text-primary hover:underline ml-auto font-medium cursor-pointer"
 >
 Clear Filters
 </Button>
 </div>
 )}
 </div>

 {/* Units Table */}
 <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800 text-[10px]">
 <tr>
 <th 
 onClick={() => handleSort('din')}
 className="py-3 px-4 cursor-pointer hover:bg-slate-900 hover:text-white select-none transition-colors"
 >
 <div className="flex items-center">
 <span>DIN Unit Ref</span>
 <span className="ml-1 text-[9px]">{sortColumn === 'din' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span>
 </div>
 </th>
 <th 
 onClick={() => handleSort('type')}
 className="py-3 px-4 cursor-pointer hover:bg-slate-900 hover:text-white select-none transition-colors"
 >
 <div className="flex items-center">
 <span>Type</span>
 <span className="ml-1 text-[9px]">{sortColumn === 'type' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span>
 </div>
 </th>
 <th 
 onClick={() => handleSort('component')}
 className="py-3 px-4 cursor-pointer hover:bg-slate-900 hover:text-white select-none transition-colors"
 >
 <div className="flex items-center">
 <span>Component</span>
 <span className="ml-1 text-[9px]">{sortColumn === 'component' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span>
 </div>
 </th>
 <th className="py-3 px-4">Lab Test Result</th>
 <th className="py-3 px-4">Infection Screening</th>
 <th 
 onClick={() => handleSort('volume')}
 className="py-3 px-4 cursor-pointer hover:bg-slate-900 hover:text-white select-none transition-colors"
 >
 <div className="flex items-center">
 <span>Volume</span>
 <span className="ml-1 text-[9px]">{sortColumn === 'volume' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span>
 </div>
 </th>
 <th className="py-3 px-4">Expiration Date</th>
 <th 
 onClick={() => handleSort('status')}
 className="py-3 px-4 cursor-pointer hover:bg-slate-900 hover:text-white select-none transition-colors"
 >
 <div className="flex items-center">
 <span>Inventory Status</span>
 <span className="ml-1 text-[9px]">{sortColumn === 'status' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span>
 </div>
 </th>
 <th className="py-3 px-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-800/60 text-slate-200 font-medium">
 {paginatedUnits.length === 0 ? (
 <tr>
 <td colSpan={9} className="p-0">
 <Empty><EmptyHeader><EmptyMedia variant="icon"><Droplet /></EmptyMedia><EmptyTitle>No inventory units found</EmptyTitle><EmptyDescription>Process uploaded collection units or adjust the active filters.</EmptyDescription></EmptyHeader></Empty>
 </td>
 </tr>
 ) : (
 paginatedUnits.map((unit) => {
 const isNonReactive = unit.testingStatus.overall === 'Passed';
 const canUpdateInventoryStatus = isInventoryHolder
 && unit.currentLocation.facilityId === user?.facilityCode
 && isNonReactive
 && selectableInventoryStatuses.includes(unit.status);

 return (
 <tr key={unit.id} className="hover:bg-slate-800/60 transition-colors">
 <td className="py-3 px-4 font-mono font-bold text-white flex items-center gap-2">
 <Droplet className={`w-3.5 h-3.5 ${isNonReactive ? 'text-primary fill-primary' : 'text-slate-500 fill-slate-500'}`} />
 <span>{unit.id}</span>
 </td>

 <td className="py-3 px-4">
 <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${getBloodGroupBadgeColor(unit.bloodType)}`}>
 {unit.bloodType}
 </span>
 </td>

 <td className="py-3 px-4 text-slate-300">
 {unit.component}
 </td>

 <td className="py-3 px-4">
 {isNonReactive ? (
 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
 <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
 Non-Reactive
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary text-primary border border-primary text-[10px] font-bold">
 <AlertTriangle className="w-3.5 h-3.5 text-primary" />
 Reactive (Failed)
 </span>
 )}
 </td>

 <td className="py-3 px-4 text-xs font-mono">
 <span className={isNonReactive ? 'text-slate-400 text-[11px]' : 'text-primary font-bold text-[11px]'}>
 {getReactiveMarkers(unit)}
 </span>
 </td>

 <td className="py-3 px-4 font-mono font-semibold text-slate-200">
 {formatNumber(unit.volumeMl)} mL
 </td>

 <td className="py-3 px-4 whitespace-nowrap">
 <p className="font-mono text-xs text-slate-300">{formatExpiryDate(unit.expiryDate)}</p>
 <p className="mt-1 text-[10px] text-slate-500">{getExpiryLabel(unit.expiryDate)}</p>
 </td>

 <td className="py-3 px-4">
 {canUpdateInventoryStatus ? (
 <Select value={unit.status} onValueChange={value => updateUnitStatus(unit.id, value as UnitStatus)}>
 <SelectTrigger size="sm" className="w-36" aria-label={`Set inventory status for ${unit.id}`}>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectGroup>
 {selectableInventoryStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
 </SelectGroup>
 </SelectContent>
 </Select>
 ) : (
 <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${getStatusBadge(unit.status)}`}>
 {unit.status}
 </span>
 )}
 </td>

 <td className="py-3 px-4 text-right">
 <div className="flex justify-end gap-2">
 {isInventoryHolder && unit.currentLocation.facilityId === user?.facilityCode && unit.receivedFrom && ['Available', 'Uncrossmatched'].includes(unit.status) && (
 <Button type="button" variant="outline" size="xs" onClick={() => setReturningUnitId(unit.id)}>
 <RotateCcw data-icon="inline-start" /> Return
 </Button>
 )}
 <Button type="button" variant="secondary" size="xs" onClick={() => setActiveUnitModal(unit.id)}>
 Inspect traceability
 </Button>
 </div>
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </div>

 {/* Datatable Pagination Footer */}
 <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
 <div className="flex items-center gap-2">
 <div className="flex items-center gap-2">
 <span>Show</span>
 <Select value={String(rowsPerPage)} onValueChange={(value) => { setRowsPerPage(Number(value)); setCurrentPage(1); }}><SelectTrigger size="sm"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{[5, 10, 20, 50].map(size => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectGroup></SelectContent></Select>
 <span>entries</span>
 </div>
 </div>

 <div className="ml-auto flex items-center gap-4">
 <span>
 Showing {formatNumber(sortedUnits.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1)} to{' '}
 {formatNumber(Math.min(currentPage * rowsPerPage, sortedUnits.length))} of{' '}
 <strong className="text-white font-mono">{formatNumber(sortedUnits.length)}</strong> entries
 </span>
 <Pagination className="m-0 w-auto"><PaginationContent>
 <PaginationItem><PaginationPrevious href="#" onClick={(event) => { event.preventDefault(); setCurrentPage(page => Math.max(1, page - 1)); }} aria-disabled={currentPage === 1} /></PaginationItem>
 {getPaginationTokens(totalPages, currentPage).map(token => token === 'ellipsis-left' || token === 'ellipsis-right' ? <PaginationItem key={token}><PaginationEllipsis /></PaginationItem> : <PaginationItem key={token}><PaginationLink href="#" isActive={token === currentPage} onClick={(event) => { event.preventDefault(); setCurrentPage(token); }}>{token}</PaginationLink></PaginationItem>)}
 <PaginationItem><PaginationNext href="#" onClick={(event) => { event.preventDefault(); setCurrentPage(page => Math.min(totalPages, page + 1)); }} aria-disabled={currentPage === totalPages} /></PaginationItem>
 </PaginationContent></Pagination>
 </div>
 </div>
 </div>

 {/* Unit Detail Modal */}
 <UnitDetailModal
 unit={selectedUnit}
 onClose={() => setActiveUnitModal(null)}
 />
 <ReturnBloodUnitDialog unit={returningUnit} open={Boolean(returningUnit)} onOpenChange={open => { if (!open) setReturningUnitId(null); }} />
 <BatchReturnBloodUnitsDialog eligibleUnits={returnableBankUnits} open={batchReturnOpen} onOpenChange={setBatchReturnOpen} />

 {currentRole === 'blood_center' && (
 <BulkInventoryModal
 isOpen={showBulkModal}
 onClose={() => setShowBulkModal(false)}
 />
 )}

 </div>
 );
};
