import { Button } from '../ui/button';
import React, { useState } from 'react';
import { Select } from '../ui/select';
import { Input } from '../ui/input';
import { 
 X, 
 Droplet, 
 Flame, 
 User, 
 Building2, 
 AlertTriangle, 
 CheckCircle2, 
 Clock, 
 ShieldAlert 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBloodData } from '../../context/BloodDataContext';
import { FullBloodType, BloodComponentType } from '../../types/blood';
import { formatNumber } from '../../lib/utils';

interface NewRequisitionModalProps {
 isOpen: boolean;
 onClose: () => void;
}

export const NewRequisitionModal: React.FC<NewRequisitionModalProps> = ({ 
 isOpen, 
 onClose
}) => {
 const { user } = useAuth();
 const { addRequisition, bloodUnits } = useBloodData();

 const [bloodType, setBloodType] = useState<FullBloodType>('O-');
 const [component, setComponent] = useState<BloodComponentType>('Packed Red Blood Cells (PRBC)');
 const [quantity, setQuantity] = useState<number>(2);
 const [patientId, setPatientId] = useState('PAT-9012');
 const [patientName, setPatientName] = useState('Maria Rodriguez');
 const [patientBloodType, setPatientBloodType] = useState<FullBloodType>('O-');
 const [diagnosis, setDiagnosis] = useState('Acute Trauma Hemorrhage - OR Suite 1');
 const [targetFacility, setTargetFacility] = useState('BICOL REGIONAL HOSPITAL AND MEDICAL CENTER');
 const [notes, setNotes] = useState('Require immediate cross-match clearance.');

 if (!isOpen) return null;

 // Check available count matching requested
 const availableCount = bloodUnits.filter(u => 
 u.bloodType === bloodType && 
 u.component === component && 
 u.status === 'Available'
 ).length;

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();

 if (addRequisition({
 requestingFacilityId: user?.facilityCode || 'BSF-SUNRISE-12',
 requestingFacilityName: user?.facilityName || 'ESTEVEZ MEMORIAL HOSPITAL INC.',
 requestingFacilityType: user?.role === 'blood_bank' ? 'blood_bank' : 'blood_service_facility',
 targetFacilityId: 'BB-STJUDE-04',
 targetFacilityName: targetFacility,
 patientId: patientId,
 patientName: patientName,
 patientBloodType: patientBloodType,
 diagnosisIndication: diagnosis,
 requiredComponent: component,
 requiredBloodType: bloodType,
 quantityRequested: Number(quantity),
 allocatedUnitIds: [],
 requestorName: user?.name || 'Clinical Staff',
 notes: notes
 })) onClose();
 };

 return (
 <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
 <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl text-slate-100 overflow-hidden">
 
 {/* Header */}
 <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary text-white">
 <Flame className="w-5 h-5 fill-current" />
 </div>
 <div>
 <h3 className="font-bold text-base text-white">Create Blood Requisition Order</h3>
 <p className="text-xs text-slate-400">Dispatch request to Blood Bank or Central Processing</p>
 </div>
 </div>

 <Button variant="ghost" size="none" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
 <X className="w-5 h-5" />
 </Button>
 </div>

 {/* Form Body */}
 <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">

 {/* Availability Alert Callout */}
 <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
 <div className="flex items-center gap-2">
 <Droplet className="w-4 h-4 text-primary fill-primary" />
 <span>Current Available Network Stock for <strong>{bloodType}</strong> ({component.split('(')[0]}):</span>
 </div>
 <span className={`font-mono font-bold px-2 py-0.5 rounded ${
 availableCount >= quantity ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-primary text-primary border border-primary'
 }`}>
 {formatNumber(availableCount)} units ready
 </span>
 </div>

 {/* Blood Product Selection */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div>
 <label className="block font-semibold text-slate-300 mb-1">Required Blood Group</label>
 <Select
 value={bloodType}
 onChange={(e) => setBloodType(e.target.value as FullBloodType)}
 className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono font-bold text-sm focus:ring-2 focus:ring-primary"
 >
 <option value="O-">O- (Universal Red Cell)</option>
 <option value="O+">O+</option>
 <option value="A-">A-</option>
 <option value="A+">A+</option>
 <option value="B-">B-</option>
 <option value="B+">B+</option>
 <option value="AB-">AB-</option>
 <option value="AB+">AB+ (Universal Plasma)</option>
 </Select>
 </div>

 <div>
 <label className="block font-semibold text-slate-300 mb-1">Component Type</label>
 <Select
 value={component}
 onChange={(e) => setComponent(e.target.value as BloodComponentType)}
 className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:ring-2 focus:ring-primary"
 >
 <option value="Packed Red Blood Cells (PRBC)">Packed Red Cells (PRBC)</option>
 <option value="Fresh Frozen Plasma (FFP)">Fresh Frozen Plasma (FFP)</option>
 <option value="Platelet Concentrate">Platelet Concentrate</option>
 <option value="Cryoprecipitate">Cryoprecipitate</option>
 <option value="Whole Blood">Whole Blood</option>
 </Select>
 </div>

 <div>
 <label className="block font-semibold text-slate-300 mb-1">Quantity (Units)</label>
 <Input
 type="number"
 min={1}
 max={20}
 value={quantity}
 onChange={(e) => setQuantity(Number(e.target.value))}
 className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono font-bold text-sm focus:ring-2 focus:ring-primary"
 />
 </div>
 </div>

 {/* Clinical Patient Requisition Details */}
 <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
 <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider">Patient & Clinical Details</h4>
 
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div>
 <label className="block text-slate-400 mb-1">Patient MRN / ID</label>
 <Input
 type="text"
 required
 value={patientId}
 onChange={(e) => setPatientId(e.target.value)}
 className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white font-mono"
 />
 </div>

 <div>
 <label className="block text-slate-400 mb-1">Patient Full Name</label>
 <Input
 type="text"
 required
 value={patientName}
 onChange={(e) => setPatientName(e.target.value)}
 className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
 />
 </div>

 <div>
 <label className="block text-slate-400 mb-1">Confirmed Patient Blood Type</label>
 <Select
 value={patientBloodType}
 onChange={(e) => setPatientBloodType(e.target.value as FullBloodType)}
 className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white font-bold"
 >
 <option value="O-">O-</option>
 <option value="O+">O+</option>
 <option value="A-">A-</option>
 <option value="A+">A+</option>
 <option value="B-">B-</option>
 <option value="B+">B+</option>
 <option value="AB-">AB-</option>
 <option value="AB+">AB+</option>
 </Select>
 </div>
 </div>

 <div>
 <label className="block text-slate-400 mb-1">Diagnosis / Transfusion Indication</label>
 <Input
 type="text"
 required
 value={diagnosis}
 onChange={(e) => setDiagnosis(e.target.value)}
 placeholder="e.g. Major surgery bleeding, severe anemia (Hb < 7 g/dL)"
 className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
 />
 </div>
 </div>

 <div>
 <label className="block font-semibold text-slate-300 mb-1">Target Blood Bank Facility</label>
 <Select
 value={targetFacility}
 onChange={(e) => setTargetFacility(e.target.value)}
 className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-medium"
 >
 <option value="BICOL REGIONAL HOSPITAL AND MEDICAL CENTER">BICOL REGIONAL HOSPITAL AND MEDICAL CENTER</option>
 <option value="BICOL SOUTH LUZON SUBNATIONAL REFERENCE LABORATORY">BICOL SOUTH LUZON SUBNATIONAL REFERENCE LABORATORY</option>
 </Select>
 </div>

 <div>
 <label className="block font-semibold text-slate-300 mb-1">Special Delivery Instructions</label>
 <textarea
 rows={2}
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
 />
 </div>

 {/* Modal Footer */}
 <div className="pt-2 flex justify-end gap-2">
 <Button variant="ghost" size="none"
 type="button"
 onClick={onClose}
 className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium hover:bg-slate-700"
 >
 Cancel
 </Button>
 <Button variant="ghost" size="none"
 type="submit"
 className="px-6 py-2.5 bg-primary hover:bg-primary text-white font-bold rounded-xl flex items-center gap-2"
 >
 <Droplet className="w-4 h-4 fill-white" />
 <span>Submit Requisition Order</span>
 </Button>
 </div>

 </form>

 </div>
 </div>
 );
};
