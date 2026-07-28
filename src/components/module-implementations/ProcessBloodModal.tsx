import { Button } from '../ui/button';
import React, { useState, useEffect } from 'react';
import { Select } from '../ui/select';
import { Input } from '../ui/input';
import { 
 Droplet, 
 ShieldCheck, 
 AlertTriangle, 
 CheckCircle2, 
 X, 
 FlaskConical, 
 Layers, 
 Info,
 Building2,
 Calendar,
 Search
} from 'lucide-react';
import { useBloodData } from '../../context/BloodDataContext';
import { FullBloodType, BloodComponentType, BloodUnit } from '../../types/blood';
import { getBloodGroupBadgeColor } from '../../lib/utils';
import { calculateExpiryFromCollectionDate } from '../../lib/bloodExpiry';

interface ProcessBloodModalProps {
 isOpen: boolean;
 onClose: () => void;
 initialUnitId?: string | null;
}

export const ProcessBloodModal: React.FC<ProcessBloodModalProps> = ({
 isOpen,
 onClose,
 initialUnitId
}) => {
 const { bloodUnits, processUnitForInventory } = useBloodData();

 // Mode: Select existing unit vs New manual entry
 const [entryMode, setEntryMode] = useState<'select' | 'manual'>('select');
 const [selectedUnitId, setSelectedUnitId] = useState<string>('');

 // Form Fields
 const [dinId, setDinId] = useState('');
 const [donorId, setDonorId] = useState('');
 const [bloodType, setBloodType] = useState<FullBloodType>('O-');
 const [component, setComponent] = useState<BloodComponentType>('Packed Red Blood Cells (PRBC)');
 const [volumeMl, setVolumeMl] = useState<number>(450);
 const [donationDate, setDonationDate] = useState(new Date().toISOString().split('T')[0]);
 const [expiryDate, setExpiryDate] = useState('');
 const [notes, setNotes] = useState('');

 // Infectious Screening Toggles
 const [hiv, setHiv] = useState<'Negative' | 'Positive'>('Negative');
 const [hbv, setHbv] = useState<'Negative' | 'Positive'>('Negative');
 const [hcv, setHcv] = useState<'Negative' | 'Positive'>('Negative');
 const [syphilis, setSyphilis] = useState<'Negative' | 'Positive'>('Negative');
 const [malaria, setMalaria] = useState<'Negative' | 'Positive'>('Negative');

 // Candidate units for processing (units in Quarantine or Testing, or all)
 const candidateUnits = bloodUnits.filter(u => 
 u.status === 'Quarantine' || u.status === 'Testing' || u.testingStatus.overall === 'Testing In Progress'
 );

 // Populate form if initialUnitId provided or selectedUnitId changes
 useEffect(() => {
 if (!isOpen) return;

 if (initialUnitId) {
 setSelectedUnitId(initialUnitId);
 setEntryMode('select');
 } else if (candidateUnits.length > 0 && entryMode === 'select' && !selectedUnitId) {
 setSelectedUnitId(candidateUnits[0].id);
 }
 }, [isOpen, initialUnitId]);

 useEffect(() => {
 if (entryMode === 'select' && selectedUnitId) {
 const found = bloodUnits.find(u => u.id === selectedUnitId);
 if (found) {
 setDinId(found.id);
 setDonorId(found.donorId);
 setBloodType(found.bloodType);
 setComponent(found.component);
 setVolumeMl(found.volumeMl);
 setDonationDate(found.donationDate);
 setExpiryDate(calculateExpiryFromCollectionDate(found.component, found.donationDate));
 
 if (found.testingStatus) {
 setHiv(found.testingStatus.hiv === 'Positive' ? 'Positive' : 'Negative');
 setHbv(found.testingStatus.hbv === 'Positive' ? 'Positive' : 'Negative');
 setHcv(found.testingStatus.hcv === 'Positive' ? 'Positive' : 'Negative');
 setSyphilis(found.testingStatus.syphilis === 'Positive' ? 'Positive' : 'Negative');
 setMalaria(found.testingStatus.malaria === 'Positive' ? 'Positive' : 'Negative');
 }
 }
 } else if (entryMode === 'manual') {
 if (!dinId) setDinId(`DIN-2026-${Math.floor(8000 + Math.random() * 1000)}`);
 if (!donorId) setDonorId(`DNR-${Math.floor(10000 + Math.random() * 90000)}`);
 setExpiryDate(calculateExpiryFromCollectionDate(component, donationDate));
 }
 }, [entryMode, selectedUnitId]);

 // Preview the expiry that will be written when this test is submitted.
 useEffect(() => {
 setExpiryDate(calculateExpiryFromCollectionDate(component, donationDate));
 
 }, [component, donationDate]);

 // Real-time Overall Evaluation
 const isNonReactive = hiv === 'Negative' && hbv === 'Negative' && hcv === 'Negative' && syphilis === 'Negative' && malaria === 'Negative';
 const overallResult: 'Passed' | 'Failed' = isNonReactive ? 'Passed' : 'Failed';

 const setAllNegative = () => {
 setHiv('Negative');
 setHbv('Negative');
 setHcv('Negative');
 setSyphilis('Negative');
 setMalaria('Negative');
 };

 const setSimulatedReactive = () => {
 setHiv('Negative');
 setHbv('Positive'); // Simulate HBV positive
 setHcv('Negative');
 setSyphilis('Negative');
 setMalaria('Negative');
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();

 processUnitForInventory({
 id: dinId || undefined,
 donorId,
 bloodType,
 component,
 volumeMl: Number(volumeMl),
 donationDate,
 expiryDate,
 testingStatus: {
 hiv,
 hbv,
 hcv,
 syphilis,
 malaria,
 overall: overallResult
 },
 currentLocation: {
 facilityId: 'NBC-METRO-01',
 facilityName: 'BICOL SOUTH LUZON SUBNATIONAL REFERENCE LABORATORY',
 role: 'blood_center',
 },
 notes: notes || (isNonReactive 
 ? 'Passed all 5 viral marker screenings. Cleared and posted to available inventory.'
 : `Tested REACTIVE for ${[
 hiv === 'Positive' && 'HIV',
 hbv === 'Positive' && 'HBV',
 hcv === 'Positive' && 'HCV',
 syphilis === 'Positive' && 'Syphilis',
 malaria === 'Positive' && 'Malaria'
 ].filter(Boolean).join(', ')}. Discarded into Biohazard Vault.`
 )
 });

 onClose();
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
 <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl my-8 overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
 
 {/* Header */}
 <div className="bg-slate-950 border-b border-slate-800 p-5 flex items-center justify-between shrink-0">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-primary/20 border border-primary/40 rounded-xl text-primary">
 <FlaskConical className="w-6 h-6" />
 </div>
 <div>
 <h2 className="text-lg font-bold text-white tracking-tight">Process Blood Unit for Inventory</h2>
 <p className="text-xs text-slate-400">
 Perform mandatory viral screening & component separation to clear units into tested inventory stock.
 </p>
 </div>
 </div>

 <Button variant="ghost" size="none"
 onClick={onClose}
 className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
 >
 <X className="w-5 h-5" />
 </Button>
 </div>

 {/* Form Body */}
 <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
 
 {/* Mode Switcher */}
 <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
 <span className="text-xs font-semibold text-slate-300 ml-1">Intake Source:</span>
 <div className="flex items-center gap-2">
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => setEntryMode('select')}
 className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
 entryMode === 'select'
 ? 'bg-primary text-white '
 : 'bg-slate-800 text-slate-400 hover:text-slate-200'
 }`}
 >
 Select Pending Collection ({candidateUnits.length})
 </Button>
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => setEntryMode('manual')}
 className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
 entryMode === 'manual'
 ? 'bg-primary text-white '
 : 'bg-slate-800 text-slate-400 hover:text-slate-200'
 }`}
 >
 New Collection DIN
 </Button>
 </div>
 </div>

 {/* Section 1: Identification & Basic Info */}
 <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-4">
 <div className="flex items-center gap-2 text-slate-300 font-bold border-b border-slate-800/80 pb-2">
 <Droplet className="w-4 h-4 text-primary fill-primary" />
 <span>Unit & Collection Identification</span>
 </div>

 {entryMode === 'select' && (
 <div>
 <label className="block text-slate-400 mb-1 font-semibold">Select Pending Collection Unit</label>
 <Select
 value={selectedUnitId}
 onChange={(e) => setSelectedUnitId(e.target.value)}
 className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:ring-2 focus:ring-primary focus:outline-none"
 >
 {candidateUnits.length === 0 ? (
 <option value="">No raw collections currently in quarantine</option>
 ) : (
 candidateUnits.map(unit => (
 <option key={unit.id} value={unit.id}>
 {unit.id} — {unit.bloodType} ({unit.component}) — Donor: {unit.donorId} — [{unit.status}]
 </option>
 ))
 )}
 </Select>
 </div>
 )}

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div>
 <label className="block text-slate-400 mb-1 font-medium">DIN Unit Number</label>
 <Input
 type="text"
 required
 value={dinId}
 onChange={(e) => setDinId(e.target.value)}
 className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono font-bold"
 />
 </div>

 <div>
 <label className="block text-slate-400 mb-1 font-medium">Donor Reference ID</label>
 <Input
 type="text"
 required
 value={donorId}
 onChange={(e) => setDonorId(e.target.value)}
 className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
 />
 </div>

 <div>
 <label className="block text-slate-400 mb-1 font-medium">ABO / Rh Blood Group</label>
 <Select
 value={bloodType}
 onChange={(e) => setBloodType(e.target.value as FullBloodType)}
 className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold"
 >
 {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map(bg => (
 <option key={bg} value={bg}>{bg}</option>
 ))}
 </Select>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label className="block text-slate-400 mb-1 font-medium">Donation Collection Date</label>
 <Input
 type="date"
 required
 value={donationDate}
 onChange={(e) => setDonationDate(e.target.value)}
 className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
 />
 </div>

 <div>
 <label className="block text-slate-400 mb-1 font-medium">Calculated Component Expiry Date</label>
 <Input
 type="date"
 value={expiryDate}
 readOnly
 aria-describedby="expiry-date-help"
 className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
 />
 <p id="expiry-date-help" className="mt-1 text-xs text-slate-500">Set automatically when the test result is submitted, using the collection date and selected component.</p>
 </div>
 </div>
 </div>

 {/* Section 2: Laboratory Viral Screening Checklist */}
 <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-4">
 
 <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
 <div className="flex items-center gap-2 text-slate-300 font-bold">
 <FlaskConical className="w-4 h-4 text-cyan-400" />
 <span>Mandatory Viral & Serology Screening</span>
 </div>

 <div className="flex items-center gap-2">
 <Button variant="ghost" size="none"
 type="button"
 onClick={setAllNegative}
 className="px-2.5 py-1 bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-800 rounded-lg text-[11px] font-bold cursor-pointer"
 >
 Set All Negative (Passed)
 </Button>
 <Button variant="ghost" size="none"
 type="button"
 onClick={setSimulatedReactive}
 className="px-2.5 py-1 bg-primary text-primary hover:bg-primary border border-primary rounded-lg text-[11px] font-bold cursor-pointer"
 >
 Test Reactive (HBV+)
 </Button>
 </div>
 </div>

 {/* Test Toggles */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
 
 {/* HIV */}
 <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
 <div className="flex justify-between items-center">
 <span className="font-bold text-white">HIV-1/2 Screening</span>
 <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${hiv === 'Negative' ? 'bg-emerald-950 text-emerald-400' : 'bg-primary text-primary'}`}>
 {hiv}
 </span>
 </div>
 <div className="grid grid-cols-2 gap-1.5">
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => setHiv('Negative')}
 className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
 hiv === 'Negative' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-950 text-slate-400 border-slate-800'
 }`}
 >
 Non-Reactive
 </Button>
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => setHiv('Positive')}
 className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
 hiv === 'Positive' ? 'bg-primary text-white border-primary' : 'bg-slate-950 text-slate-400 border-slate-800'
 }`}
 >
 Reactive (+)
 </Button>
 </div>
 </div>

 {/* HBV */}
 <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
 <div className="flex justify-between items-center">
 <span className="font-bold text-white">Hepatitis B (HBsAg)</span>
 <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${hbv === 'Negative' ? 'bg-emerald-950 text-emerald-400' : 'bg-primary text-primary'}`}>
 {hbv}
 </span>
 </div>
 <div className="grid grid-cols-2 gap-1.5">
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => setHbv('Negative')}
 className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
 hbv === 'Negative' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-950 text-slate-400 border-slate-800'
 }`}
 >
 Non-Reactive
 </Button>
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => setHbv('Positive')}
 className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
 hbv === 'Positive' ? 'bg-primary text-white border-primary' : 'bg-slate-950 text-slate-400 border-slate-800'
 }`}
 >
 Reactive (+)
 </Button>
 </div>
 </div>

 {/* HCV */}
 <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
 <div className="flex justify-between items-center">
 <span className="font-bold text-white">Hepatitis C (HCV Ab)</span>
 <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${hcv === 'Negative' ? 'bg-emerald-950 text-emerald-400' : 'bg-primary text-primary'}`}>
 {hcv}
 </span>
 </div>
 <div className="grid grid-cols-2 gap-1.5">
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => setHcv('Negative')}
 className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
 hcv === 'Negative' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-950 text-slate-400 border-slate-800'
 }`}
 >
 Non-Reactive
 </Button>
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => setHcv('Positive')}
 className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
 hcv === 'Positive' ? 'bg-primary text-white border-primary' : 'bg-slate-950 text-slate-400 border-slate-800'
 }`}
 >
 Reactive (+)
 </Button>
 </div>
 </div>

 {/* Syphilis */}
 <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
 <div className="flex justify-between items-center">
 <span className="font-bold text-white">Syphilis Serology</span>
 <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${syphilis === 'Negative' ? 'bg-emerald-950 text-emerald-400' : 'bg-primary text-primary'}`}>
 {syphilis}
 </span>
 </div>
 <div className="grid grid-cols-2 gap-1.5">
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => setSyphilis('Negative')}
 className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
 syphilis === 'Negative' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-950 text-slate-400 border-slate-800'
 }`}
 >
 Non-Reactive
 </Button>
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => setSyphilis('Positive')}
 className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
 syphilis === 'Positive' ? 'bg-primary text-white border-primary' : 'bg-slate-950 text-slate-400 border-slate-800'
 }`}
 >
 Reactive (+)
 </Button>
 </div>
 </div>

 {/* Malaria */}
 <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
 <div className="flex justify-between items-center">
 <span className="font-bold text-white">Malaria Antigen / NAT</span>
 <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${malaria === 'Negative' ? 'bg-emerald-950 text-emerald-400' : 'bg-primary text-primary'}`}>
 {malaria}
 </span>
 </div>
 <div className="grid grid-cols-2 gap-1.5">
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => setMalaria('Negative')}
 className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
 malaria === 'Negative' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-950 text-slate-400 border-slate-800'
 }`}
 >
 Non-Reactive
 </Button>
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => setMalaria('Positive')}
 className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
 malaria === 'Positive' ? 'bg-primary text-white border-primary' : 'bg-slate-950 text-slate-400 border-slate-800'
 }`}
 >
 Reactive (+)
 </Button>
 </div>
 </div>

 </div>

 {/* Dynamic Result Evaluation Banner */}
 <div className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
 isNonReactive
 ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-200'
 : 'bg-primary/60 border-primary/80 text-primary'
 }`}>
 {isNonReactive ? (
 <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
 ) : (
 <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
 )}
 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <span className="font-bold text-sm">
 {isNonReactive ? 'CLEARED: NON-REACTIVE TEST RESULT' : 'FLAGGED: REACTIVE TEST RESULT DETECTED'}
 </span>
 <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
 isNonReactive ? 'bg-emerald-900 text-emerald-100' : 'bg-primary text-primary'
 }`}>
 {isNonReactive ? 'Added to Inventory' : 'Excluded from Inventory'}
 </span>
 </div>
 <p className="text-[11px] leading-relaxed opacity-90">
 {isNonReactive 
 ? 'All 5 mandatory viral screening markers tested Non-Reactive. This blood unit is fully cleared and will be added as AVAILABLE stock in the tested blood inventory.'
 : 'Infectious markers detected! Safety protocol requires immediate quarantine and disposal. This record will be stored under Discarded / Biohazard tracking for safety audits and WILL NOT enter usable inventory.'}
 </p>
 </div>
 </div>

 </div>

 {/* Section 3: Component Separation & Storage Allocation */}
 <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-4">
 <div className="flex items-center gap-2 text-slate-300 font-bold border-b border-slate-800/80 pb-2">
 <Layers className="w-4 h-4 text-purple-400" />
 <span>Component Separation & Storage Allocation</span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label className="block text-slate-400 mb-1 font-medium">Separated Component Type</label>
 <Select
 value={component}
 onChange={(e) => setComponent(e.target.value as BloodComponentType)}
 className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-medium"
 >
 <option value="Packed Red Blood Cells (PRBC)">Packed Red Blood Cells (PRBC)</option>
 <option value="Fresh Frozen Plasma (FFP)">Fresh Frozen Plasma (FFP)</option>
 <option value="Platelet Concentrate">Platelet Concentrate</option>
 <option value="Cryoprecipitate">Cryoprecipitate</option>
 <option value="Whole Blood">Whole Blood</option>
 </Select>
 </div>

 <div>
 <label className="block text-slate-400 mb-1 font-medium">Unit Volume (mL)</label>
 <Input
 type="number"
 required
 value={volumeMl}
 onChange={(e) => setVolumeMl(Number(e.target.value))}
 className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
 />
 </div>
 </div>

 <div>
 <div>
 <label className="block text-slate-400 mb-1 font-medium">Processing Notes & Remarks</label>
 <Input
 type="text"
 placeholder="Optional QA remarks or processing batch notes..."
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
 />
 </div>
 </div>
 </div>

 {/* Footer Submit */}
 <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
 <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
 <Info className="w-4 h-4 text-slate-500 shrink-0" />
 <span>
 {isNonReactive 
 ? 'Unit will be saved as Available stock in Blood Inventory.' 
 : 'Unit will be saved as Discarded record in Blood Inventory.'}
 </span>
 </div>

 <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
 <Button variant="ghost" size="none"
 type="button"
 onClick={onClose}
 className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer w-full sm:w-auto"
 >
 Cancel
 </Button>

 <Button variant="ghost" size="none"
 type="submit"
 className={`px-6 py-2.5 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto ${
 isNonReactive
 ? 'bg-emerald-600 hover:bg-emerald-500 text-white '
 : 'bg-primary hover:bg-primary text-white '
 }`}
 >
 {isNonReactive ? (
 <>
 <ShieldCheck className="w-4 h-4" />
 <span>Add Cleared Unit to Inventory</span>
 </>
 ) : (
 <>
 <AlertTriangle className="w-4 h-4" />
 <span>Flag & Record Discard</span>
 </>
 )}
 </Button>
 </div>
 </div>

 </form>

 </div>
 </div>
 );
};
