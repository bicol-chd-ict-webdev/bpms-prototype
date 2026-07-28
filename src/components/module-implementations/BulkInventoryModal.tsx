import { Button } from '../ui/button';
import React, { useState, useEffect } from 'react';
import { Select } from '../ui/select';
import { 
 Droplet, 
 ShieldCheck, 
 AlertTriangle, 
 X, 
 Layers, 
 Zap, 
 Info,
 Database
} from 'lucide-react';
import { useBloodData } from '../../context/BloodDataContext';
import { FullBloodType, BloodComponentType } from '../../types/blood';

interface BulkInventoryModalProps {
 isOpen: boolean;
 onClose: () => void;
}

interface BatchUnitItem {
 id: string;
 bloodType: FullBloodType;
 component: BloodComponentType;
 volumeMl: number;
 donorId: string;
 isNonReactive: boolean; // true = Cleared to Stock, false = Reactive Discard
 reactiveInfection?: string; // Optional infection marker if reactive
}

// Component specs definition for quick selection reference
const COMPONENT_SPECS: {
 type: BloodComponentType;
 shortName: string;
 defaultVolume: number;
 storageTemp: string;
 shelfLife: string;
 icon: string;
 color: string;
}[] = [
 {
 type: 'Packed Red Blood Cells (PRBC)',
 shortName: 'PRBC',
 defaultVolume: 250,
 storageTemp: '2°C to 6°C',
 shelfLife: '35 Days (CPDA-1)',
 icon: '🩸',
 color: 'border-primary/40 bg-primary/20 text-primary'
 },
 {
 type: 'Fresh Frozen Plasma (FFP)',
 shortName: 'FFP',
 defaultVolume: 200,
 storageTemp: '-18°C or colder',
 shelfLife: 'Not defined by policy',
 icon: '🧪',
 color: 'border-amber-500/40 bg-amber-950/20 text-amber-300'
 },
 {
 type: 'Platelet Concentrate',
 shortName: 'Platelets',
 defaultVolume: 60,
 storageTemp: '20°C to 24°C (Agitated)',
 shelfLife: '5 Days (CPDA-1)',
 icon: '🟡',
 color: 'border-yellow-500/40 bg-yellow-950/20 text-yellow-300'
 },
 {
 type: 'Cryoprecipitate',
 shortName: 'Cryo',
 defaultVolume: 15,
 storageTemp: '-18°C or colder',
 shelfLife: 'Not defined by policy',
 icon: '❄️',
 color: 'border-cyan-500/40 bg-cyan-950/20 text-cyan-300'
 },
 {
 type: 'Whole Blood',
 shortName: 'Whole Blood',
 defaultVolume: 450,
 storageTemp: '2°C to 6°C',
 shelfLife: 'Not defined by policy',
 icon: '🩸',
 color: 'border-slate-500/40 bg-slate-900 text-slate-300'
 }
];

export const BulkInventoryModal: React.FC<BulkInventoryModalProps> = ({
 isOpen,
 onClose
}) => {
 const { bloodUnits, bulkProcessInventory } = useBloodData();

 // Workflow Mode: 'bulk_wizard' (Configurator) vs 'unit_table' (Editable Table)
 const [workflowMode, setWorkflowMode] = useState<'bulk_wizard' | 'unit_table'>('bulk_wizard');

 // Filter actual pending units from collections data (overall testing status is not Passed or Failed)
 const pendingUnits = bloodUnits.filter(u => 
 u.testingStatus.overall !== 'Passed' && u.testingStatus.overall !== 'Failed'
 );

 // Editable Batch List state matching pending units
 const [batchItems, setBatchItems] = useState<BatchUnitItem[]>([]);
 const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());

 // Configurator state
 const [selectedBloodType, setSelectedBloodType] = useState<FullBloodType | 'ALL'>('ALL');
 const [screeningOutcome, setScreeningOutcome] = useState<'non_reactive' | 'reactive'>('non_reactive');
 const [selectedComponent, setSelectedComponent] = useState<BloodComponentType>('Packed Red Blood Cells (PRBC)');
 const [reactiveMarker, setReactiveMarker] = useState<string>('HBV (Hepatitis B)');

 // Initialize batch items with pending units when modal opens
 useEffect(() => {
 if (isOpen) {
 const nextBatchItems = pendingUnits.map(u => ({
 id: u.id,
 bloodType: u.bloodType,
 component: u.component,
 volumeMl: u.volumeMl,
 donorId: u.donorId,
 isNonReactive: true // Default to safe/non-reactive clearance
 }));
 setBatchItems(nextBatchItems);
 setSelectedUnitIds(new Set(nextBatchItems.map(item => item.id)));
 }
 }, [isOpen]);

 // Apply bulk configuration to filtered matching units in the batchItems state
 const handleApplyConfig = () => {
 const matchingUnitIds = batchItems
 .filter(item => selectedBloodType === 'ALL' || item.bloodType === selectedBloodType)
 .map(item => item.id);

 setBatchItems(prev => prev.map(item => {
 const matchesFilter = selectedBloodType === 'ALL' || item.bloodType === selectedBloodType;
 if (!matchesFilter) return item;

 const isCleared = screeningOutcome === 'non_reactive';
 const spec = COMPONENT_SPECS.find(s => s.type === selectedComponent);
 
 return {
 ...item,
 isNonReactive: isCleared,
 component: isCleared ? selectedComponent : 'Whole Blood',
 volumeMl: isCleared ? (spec ? spec.defaultVolume : item.volumeMl) : 450,
 reactiveInfection: isCleared ? undefined : reactiveMarker
 };
 }));

 // Applying a scoped configuration also defines the exact subset to clear.
 setSelectedUnitIds(new Set(matchingUnitIds));

 // Switch to table view to inspect changes
 setWorkflowMode('unit_table');
 };

 // Toggle individual unit outcome status
 const toggleUnitOutcome = (index: number) => {
 setBatchItems(prev => prev.map((item, idx) => {
 if (idx !== index) return item;
 const nextStatus = !item.isNonReactive;
 return {
 ...item,
 isNonReactive: nextStatus,
 component: nextStatus ? selectedComponent : 'Whole Blood',
 volumeMl: nextStatus ? 250 : 450
 };
 }));
 };

 // Preset operations
 const applyPresetAllNonReactive = () => {
 setBatchItems(prev => prev.map(item => ({ 
 ...item, 
 isNonReactive: true,
 component: selectedComponent
 })));
 };

 const applyPresetAllReactive = () => {
 setBatchItems(prev => prev.map(item => ({ 
 ...item, 
 isNonReactive: false,
 component: 'Whole Blood'
 })));
 };

 const toggleUnitSelection = (unitId: string) => {
 setSelectedUnitIds(previous => {
 const next = new Set(previous);
 if (next.has(unitId)) next.delete(unitId);
 else next.add(unitId);
 return next;
 });
 };

 const toggleAllUnitSelections = () => {
 setSelectedUnitIds(previous =>
 previous.size === batchItems.length ? new Set() : new Set(batchItems.map(item => item.id))
 );
 };

 // Stats calculations
 const totalInBatch = batchItems.length;
 const selectedBatchItems = batchItems.filter(item => selectedUnitIds.has(item.id));
 const selectedForClearanceCount = selectedBatchItems.length;
 const nonReactiveInBatch = selectedBatchItems.filter(i => i.isNonReactive).length;
 const reactiveInBatch = selectedForClearanceCount - nonReactiveInBatch;
 const totalVolumeLiters = (selectedBatchItems.reduce((acc, curr) => acc + curr.volumeMl, 0) / 1000).toFixed(2);

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (selectedBatchItems.length === 0) return;

 bulkProcessInventory(selectedBatchItems.map(item => ({
 id: item.id,
 bloodType: item.bloodType,
 component: item.component,
 volumeMl: item.volumeMl,
 donorId: item.donorId,
 isNonReactive: item.isNonReactive
 })));

 onClose();
 };

 // Count pending units matching selection filter
 const matchingPendingCount = batchItems.filter(item => 
 selectedBloodType === 'ALL' || item.bloodType === selectedBloodType
 ).length;

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
 <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl my-6 overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
 
 {/* Modal Header */}
 <div className="bg-slate-950 border-b border-slate-800 p-5 flex items-center justify-between shrink-0">
 <div className="flex items-center gap-3">
 <div className="p-3 bg-primary/20 border border-primary/40 rounded-2xl text-primary">
 <Layers className="w-6 h-6" />
 </div>
 <div>
 <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
 <span>Lab Screening & Clearance</span>
 <span className="px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-800 text-amber-300 text-[10px] font-mono uppercase tracking-wider">
 Pending Collections Only
 </span>
 </h2>
 <p className="text-xs text-slate-400 mt-0.5">
 Process registered raw blood units awaiting lab clearance. Select screening outcome, configure components for non-reactive units, and commit to inventory.
 </p>
 </div>
 </div>

 <Button variant="ghost" size="none"
 type="button"
 onClick={onClose}
 className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 rounded-xl transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
 >
 <X className="w-5 h-5" />
 </Button>
 </div>

 {/* Workflow Tabs */}
 <div className="bg-slate-950/90 px-5 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto shrink-0 text-xs">
 <div className="flex shrink-0 items-center gap-1.5">
 <Button variant="ghost" size="none"
 onClick={() => setWorkflowMode('bulk_wizard')}
 disabled={totalInBatch === 0}
 className={`px-3 py-2 rounded-xl font-bold text-[11px] transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
 workflowMode === 'bulk_wizard'
 ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
 : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-100'
 }`}
 >
 <Zap className="w-3.5 h-3.5 text-amber-300" />
 <span>Bulk Outcome Configurator</span>
 </Button>

 <Button variant="ghost" size="none"
 onClick={() => setWorkflowMode('unit_table')}
 className={`px-3 py-2 rounded-xl font-bold text-[11px] transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
 workflowMode === 'unit_table'
 ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
 : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-100'
 }`}
 >
 <Database className="w-3.5 h-3.5 text-cyan-400" />
 <span>Inspect Pending Batch ({selectedForClearanceCount}/{totalInBatch})</span>
 </Button>
 </div>

 {/* Quick Presets */}
 {totalInBatch > 0 && (
 <div className="ml-2 hidden shrink-0 items-center gap-1.5 border-l border-slate-800 pl-3 sm:flex">
 <Button variant="ghost" size="none"
 type="button"
 onClick={applyPresetAllNonReactive}
 className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 active:scale-[0.98] text-emerald-300 border border-emerald-800 rounded-xl font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
 >
 <ShieldCheck className="w-3.5 h-3.5" />
 <span>Mark All Non-Reactive</span>
 </Button>

 <Button variant="ghost" size="none"
 type="button"
 onClick={applyPresetAllReactive}
 className="px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] border border-primary rounded-xl font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
 >
 <AlertTriangle className="w-3.5 h-3.5" />
 <span>Mark All Reactive</span>
 </Button>
 </div>
 )}
 </div>

 {/* Live Metrics Header Bar */}
 <div className="bg-slate-950/60 border-b border-slate-800 px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0 text-xs">
 <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
 <span className="text-slate-400 font-medium">Selected to Process:</span>
 <span className="text-lg font-mono font-black text-white">{selectedForClearanceCount}</span>
 </div>

 <div className="p-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/80 flex items-center justify-between">
 <span className="text-emerald-300 font-bold flex items-center gap-1.5">
 <ShieldCheck className="w-4 h-4 text-emerald-400" />
 Non-Reactive:
 </span>
 <span className="text-lg font-mono font-black text-emerald-300">{nonReactiveInBatch}</span>
 </div>

 <div className="p-2.5 rounded-2xl bg-primary/40 border border-primary/80 flex items-center justify-between">
 <span className="text-primary font-bold flex items-center gap-1.5">
 <AlertTriangle className="w-4 h-4 text-primary" />
 Reactive Discard:
 </span>
 <span className="text-lg font-mono font-black text-primary">{reactiveInBatch}</span>
 </div>

 <div className="p-2.5 rounded-2xl bg-cyan-950/40 border border-cyan-800/80 flex items-center justify-between">
 <span className="text-cyan-300 font-bold flex items-center gap-1.5">
 <Droplet className="w-4 h-4 text-cyan-400" />
 Total Vol:
 </span>
 <span className="text-lg font-mono font-black text-cyan-300">{totalVolumeLiters} L</span>
 </div>
 </div>

 {/* Modal Scrollable Content */}
 <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">

 {/* Validation/Empty State warning */}
 {totalInBatch === 0 ? (
 <div className="p-8 text-center bg-slate-950/60 rounded-3xl border border-slate-800 space-y-4">
 <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
 <div className="space-y-1">
 <h3 className="text-sm font-bold text-white">No Pending Collections Available</h3>
 <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
 All registered blood units have already been tested. To clear new inventory, first register raw donor collections or upload collection sheets via the "Upload Excel" button.
 </p>
 </div>
 </div>
 ) : (
 <>
 {/* TAB 1: BULK WIZARD */}
 {workflowMode === 'bulk_wizard' && (
 <div className="space-y-6 animate-in fade-in duration-200">

 {/* STEP 1: OUTCOME SELECTION */}
 <div className="space-y-3">
 <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
 <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-mono">1</span>
 Select Bulk Outcome
 </span>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => setScreeningOutcome('non_reactive')}
 aria-pressed={screeningOutcome === 'non_reactive'}
 className={`w-full flex flex-col items-stretch justify-start whitespace-normal p-4 rounded-2xl border text-left cursor-pointer transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
 screeningOutcome === 'non_reactive'
 ? 'bg-emerald-950/50 hover:bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/40 shadow-sm'
 : 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/70 hover:bg-emerald-950/30'
 }`}
 >
 <div className="flex items-start justify-between mb-2">
 <div className="p-2 rounded-xl bg-emerald-900/60 border border-emerald-700 text-emerald-300">
 <ShieldCheck className="w-5 h-5" />
 </div>
 <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
 screeningOutcome === 'non_reactive' ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold' : 'border-slate-700'
 }`}>
 {screeningOutcome === 'non_reactive' && '✓'}
 </span>
 </div>
 <h3 className="text-sm font-bold text-emerald-300">NON-REACTIVE (Clear to Stock)</h3>
 <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
 Units tested negative for bloodborne screening pathogens. Proceed to select target component separation.
 </p>
 </Button>

 <Button variant="ghost" size="none"
 type="button"
 onClick={() => setScreeningOutcome('reactive')}
 aria-pressed={screeningOutcome === 'reactive'}
 className={`w-full flex flex-col items-stretch justify-start whitespace-normal p-4 rounded-2xl border text-left cursor-pointer transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
 screeningOutcome === 'reactive'
 ? 'bg-primary hover:bg-primary text-primary-foreground hover:text-primary-foreground border-primary ring-2 ring-primary/40 shadow-sm'
 : 'bg-slate-950/80 border-slate-800 hover:border-primary/70 hover:bg-primary/10'
 }`}
 >
 <div className="flex items-start justify-between mb-2">
 <div className={`p-2 rounded-xl border ${screeningOutcome === 'reactive' ? 'bg-primary-foreground/15 border-primary-foreground/30 text-primary-foreground' : 'bg-primary/15 border-primary/40 text-primary'}`}>
 <AlertTriangle className="w-5 h-5" />
 </div>
 <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
 screeningOutcome === 'reactive' ? 'bg-primary-foreground border-primary-foreground text-primary font-bold' : 'border-slate-700'
 }`}>
 {screeningOutcome === 'reactive' && '✓'}
 </span>
 </div>
 <h3 className={`text-sm font-bold ${screeningOutcome === 'reactive' ? 'text-primary-foreground' : 'text-primary'}`}>REACTIVE (Flag & Discard)</h3>
 <p className={`text-[11px] mt-1 leading-relaxed ${screeningOutcome === 'reactive' ? 'text-primary-foreground/85' : 'text-slate-400'}`}>
 Units tested positive for infectious disease markers. Auto-flagged and routed to Biohazard Quarantine for discard.
 </p>
 </Button>
 </div>
 </div>

 {/* STEP 2: COMPONENT SELECTION (IF NON-REACTIVE) */}
 {screeningOutcome === 'non_reactive' ? (
 <div className="space-y-3 p-5 rounded-3xl bg-slate-950/80 border border-slate-800">
 <div className="flex items-center justify-between">
 <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
 <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-mono">2</span>
 Select Target Blood Component for Cleared Stock
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
 {COMPONENT_SPECS.map(spec => (
 <Button variant="ghost" size="none"
 type="button"
 key={spec.type}
 onClick={() => setSelectedComponent(spec.type)}
 aria-pressed={selectedComponent === spec.type}
 className={`w-full flex flex-col items-stretch justify-between whitespace-normal p-3.5 rounded-2xl border text-left cursor-pointer transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
 selectedComponent === spec.type
 ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/40 shadow-sm'
 : 'bg-slate-900/60 border-slate-800 hover:border-emerald-500/70 hover:bg-slate-800'
 }`}
 >
 <div>
 <div className="flex items-center justify-between mb-2">
 <span className="text-xl">{spec.icon}</span>
 <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${spec.color}`}>
 {spec.shortName}
 </span>
 </div>
 <h4 className="font-bold text-white text-xs leading-tight mb-1">{spec.type}</h4>
 </div>
 <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 space-y-0.5">
 <div>Default Volume: <span className="text-slate-200 font-mono font-bold">{spec.defaultVolume} mL</span></div>
 <div>Storage Temp: <span className="text-slate-300 font-medium">{spec.storageTemp}</span></div>
 <div>Shelf Life: <span className="text-slate-300 font-medium">{spec.shelfLife}</span></div>
 </div>
 </Button>
 ))}
 </div>
 </div>
 ) : (
 <div className="p-4 rounded-2xl bg-primary/30 border border-primary/60 flex items-start gap-3">
 <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
 <div className="space-y-2">
 <h4 className="font-bold text-primary text-xs">Reactive Screening Discard Protocol:</h4>
 <p className="text-slate-300 leading-relaxed text-[11px]">
 These units will be recorded as <strong>Whole Blood (Biohazard Discard)</strong>. Please select the primary reactive screening pathogen marker below to record in system safety audit logs:
 </p>
 <Select
 value={reactiveMarker}
 onChange={(e) => setReactiveMarker(e.target.value)}
 className="bg-slate-900 border border-primary rounded-xl px-3 py-1.5 text-primary font-bold text-xs"
 >
 <option value="HBV (Hepatitis B)">HBV (Hepatitis B)</option>
 <option value="HIV 1/2">HIV 1/2</option>
 <option value="HCV (Hepatitis C)">HCV (Hepatitis C)</option>
 <option value="Syphilis (VDRL)">Syphilis (VDRL)</option>
 <option value="Malaria Antigen">Malaria Antigen</option>
 <option value="Multiple Positive Markers">Multiple Screening Markers</option>
 </Select>
 </div>
 </div>
 )}

 {/* STEP 3: SELECT SCOPE (FILTER BY BLOOD GROUP) */}
 <div className="p-4 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-2.5">
 <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
 <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
 <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-mono">3</span>
 Select Group Scope & Apply
 </span>
 <span className="text-[11px] font-semibold text-slate-400">Clearance Blood Group Scope:</span>
 </div>

 <div className="flex flex-wrap items-center gap-2">
 <div className="flex flex-wrap gap-1">
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => setSelectedBloodType('ALL')}
 className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-[0.98] border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
 selectedBloodType === 'ALL'
 ? 'bg-slate-100 text-slate-900 border-white font-bold shadow-sm'
 : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
 }`}
 >
 All Groups
 </Button>
 {(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] as FullBloodType[]).map(bg => (
 <Button variant="ghost" size="none"
 key={bg}
 type="button"
 onClick={() => setSelectedBloodType(bg)}
 className={`px-2.5 py-1.5 rounded-xl font-black text-xs transition-all active:scale-[0.98] border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
 selectedBloodType === bg
 ? 'bg-primary text-primary-foreground border-primary shadow-sm'
 : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
 }`}
 >
 {bg}
 </Button>
 ))}
 </div>

 <div className="ml-auto flex items-center justify-end gap-2.5">
 <div className="text-right">
 <div className="text-white font-bold">{matchingPendingCount} matching units</div>
 <div className="text-[10px] text-slate-500">found in pending list</div>
 </div>

 <Button variant="ghost" size="none"
 type="button"
 onClick={handleApplyConfig}
 disabled={matchingPendingCount === 0}
 className="px-4 py-2.5 bg-primary hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 text-primary-foreground font-bold rounded-xl text-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
 >
 Apply & Select {matchingPendingCount} Units
 </Button>
 </div>
 </div>
 </div>

 </div>
 )}

 {/* TAB 2: INSPECT BATCH TABLE */}
 {workflowMode === 'unit_table' && (
 <div className="space-y-4 animate-in fade-in duration-200">
 <p className="text-xs text-slate-400">Select only the units with completed test results. Unselected units remain pending for a later clearance batch.</p>
 <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
 <table className="w-full text-left text-xs">
 <thead className="bg-slate-900 text-slate-400 uppercase font-mono tracking-wider text-[10px] border-b border-slate-800">
 <tr>
 <th className="py-3 px-3 text-center">
 <Button variant="ghost" size="none"
 type="button"
 onClick={toggleAllUnitSelections}
 aria-label={selectedForClearanceCount === totalInBatch ? 'Deselect all units' : 'Select all units'}
 className="inline-flex items-center justify-center text-slate-400 hover:text-primary active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
 >
 <ShieldCheck className={`w-4 h-4 ${selectedForClearanceCount === totalInBatch ? 'text-emerald-400' : ''}`} />
 </Button>
 </th>
 <th className="py-3 px-3">DIN (Serial)</th>
 <th className="py-3 px-3">Group</th>
 <th className="py-3 px-3">Blood Component</th>
 <th className="py-3 px-3">Volume</th>
 <th className="py-3 px-3 text-center">Outcome Status</th>
 <th className="py-3 px-3 text-right">Process now</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-800/80 font-mono">
 {batchItems.map((item, idx) => (
 <tr key={`${item.id}-${idx}`} className="group hover:bg-slate-800/40 transition-colors">
 <td className="py-3 px-3 text-center">
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => toggleUnitSelection(item.id)}
 aria-pressed={selectedUnitIds.has(item.id)}
 aria-label={`${selectedUnitIds.has(item.id) ? 'Exclude' : 'Include'} ${item.id} from this clearance`}
 className={`inline-flex h-6 w-6 items-center justify-center rounded-md border transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
 selectedUnitIds.has(item.id)
 ? 'border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-500'
 : 'border-slate-700 bg-slate-900 text-slate-500 hover:border-primary hover:text-primary'
 }`}
 >
 <ShieldCheck className="w-3.5 h-3.5" />
 </Button>
 </td>
 <td className="py-3 px-3 font-bold text-white">{item.id}</td>
 
 <td className="py-3 px-3">
 <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 font-bold">
 {item.bloodType}
 </span>
 </td>

 <td className="py-3 px-3 font-sans">
 <Select
 value={item.component}
 disabled={!item.isNonReactive}
 onChange={(e) => {
 const val = e.target.value as BloodComponentType;
 setBatchItems(prev => prev.map((it, i) => i === idx ? { ...it, component: val } : it));
 }}
 className="bg-slate-900 border border-slate-700 text-slate-200 font-medium rounded-lg px-2 py-1 text-xs disabled:opacity-40"
 >
 <option value="Packed Red Blood Cells (PRBC)">Packed Red Cells (PRBC)</option>
 <option value="Fresh Frozen Plasma (FFP)">Fresh Frozen Plasma (FFP)</option>
 <option value="Platelet Concentrate">Platelet Concentrate</option>
 <option value="Cryoprecipitate">Cryoprecipitate</option>
 <option value="Whole Blood">Whole Blood</option>
 </Select>
 </td>

 <td className="py-3 px-3 text-slate-300">{item.volumeMl} mL</td>

 <td className="py-3 px-3 text-center font-sans">
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => toggleUnitOutcome(idx)}
 className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-[0.98] border flex items-center justify-center gap-1.5 mx-auto cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
 item.isNonReactive
 ? 'bg-emerald-950 text-emerald-300 border-emerald-700 hover:bg-emerald-900'
 : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
 }`}
 >
 {item.isNonReactive ? (
 <>
 <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
 <span>Non-Reactive (Clear)</span>
 </>
 ) : (
 <>
 <AlertTriangle className="w-3.5 h-3.5 text-primary-foreground" />
 <span>Reactive (Discard)</span>
 </>
 )}
 </Button>
 </td>

 <td className="py-3 px-3 text-right">
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => toggleUnitSelection(item.id)}
 aria-pressed={selectedUnitIds.has(item.id)}
 className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition-all active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
 selectedUnitIds.has(item.id)
 ? 'text-emerald-300 hover:bg-emerald-950/60 hover:text-emerald-200'
 : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
 }`}
 title={selectedUnitIds.has(item.id) ? 'Exclude from this clearance batch' : 'Include in this clearance batch'}
 >
 <ShieldCheck className="w-3.5 h-3.5" />
 <span>{selectedUnitIds.has(item.id) ? 'Included' : 'Excluded'}</span>
 </Button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}
 </>
 )}

 </div>

 {/* Modal Footer */}
 <div className="bg-slate-950 border-t border-slate-800 p-5 flex items-center justify-between shrink-0">
 <div className="text-slate-400 text-xs">
 <strong className="text-white">{selectedForClearanceCount} units</strong> selected of {totalInBatch} pending collections
 </div>

 <div className="flex items-center gap-3">
 <Button variant="ghost" size="none"
 type="button"
 onClick={onClose}
 className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-300 font-semibold rounded-xl text-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
 >
 Cancel
 </Button>

 <Button variant="ghost" size="none"
 type="button"
 onClick={handleSubmit}
 disabled={selectedForClearanceCount === 0}
 className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
 >
 <ShieldCheck className="w-4 h-4" />
 <span>Commit Clearance ({selectedForClearanceCount} Units)</span>
 </Button>
 </div>
 </div>

 </div>
 </div>
 );
};
