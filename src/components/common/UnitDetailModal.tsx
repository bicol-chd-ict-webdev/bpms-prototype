import { Button } from '../ui/button';
import React from 'react';
import { 
 X, 
 Droplet, 
 ShieldCheck, 
 MapPin, 
 Calendar, 
 FileText, 
 UserCheck, 
 Activity, 
 AlertTriangle,
 Clock
} from 'lucide-react';
import { BloodUnit, UnitStatus } from '../../types/blood';
import { formatNumber, getBloodGroupBadgeColor, getStatusBadge } from '../../lib/utils';

interface UnitDetailModalProps {
 unit: BloodUnit | null;
 onClose: () => void;
 onUpdateStatus?: (unitId: string, newStatus: UnitStatus) => void;
}

export const UnitDetailModal: React.FC<UnitDetailModalProps> = ({ unit, onClose, onUpdateStatus }) => {
 if (!unit) return null;

 // Calculate days remaining
 const expiry = new Date(unit.expiryDate).getTime();
 const now = new Date().getTime();
 const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
 const isExpiringSoon = diffDays > 0 && diffDays <= 7;
 const isExpired = diffDays <= 0;

 return (
 <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
 <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl text-slate-100 overflow-hidden">
 
 {/* Modal Header */}
 <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${getBloodGroupBadgeColor(unit.bloodType)}`}>
 {unit.bloodType}
 </div>
 <div>
 <div className="flex items-center gap-2">
 <span className="font-mono font-bold text-lg text-white">{unit.id}</span>
 <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadge(unit.status)}`}>
 {unit.status}
 </span>
 </div>
 <p className="text-xs text-slate-400 font-medium">{unit.component}</p>
 </div>
 </div>

 <Button variant="ghost" size="none"
 onClick={onClose}
 className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
 >
 <X className="w-5 h-5" />
 </Button>
 </div>

 {/* Modal Body */}
 <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

 {/* Expiration warning banner if applicable */}
 {isExpiringSoon && (
 <div className="p-3 bg-amber-950/60 border border-amber-800/80 rounded-xl flex items-center gap-3 text-amber-300 text-xs font-medium">
 <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
 <span>
 <strong>Shelf-Life Alert:</strong> This unit will expire in <strong>{formatNumber(diffDays)} days</strong> ({unit.expiryDate}). Prioritize dispatch/cross-match.
 </span>
 </div>
 )}

 {isExpired && (
 <div className="p-3 rounded-xl border border-rose-800 bg-rose-950/50 flex items-center gap-3 text-rose-300 text-xs font-medium">
 <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0" />
 <span>
 <strong>EXPIRED UNIT:</strong> This blood product expired on {unit.expiryDate}. Quarantine immediately for disposal protocol.
 </span>
 </div>
 )}

 {/* Primary Metric Grid */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
 <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
 <span className="text-slate-400 block mb-1">Volume</span>
 <span className="font-bold text-base text-white font-mono">{formatNumber(unit.volumeMl)} mL</span>
 </div>
 <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
 <span className="text-slate-400 block mb-1">Donation Date</span>
 <span className="font-semibold text-slate-200">{unit.donationDate}</span>
 </div>
 <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
 <span className="text-slate-400 block mb-1">Expiry Date</span>
 <span className={`font-semibold ${isExpiringSoon ? 'text-amber-400' : isExpired ? 'text-primary' : 'text-emerald-400'}`}>
 {unit.expiryDate}
 </span>
 </div>
 <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
 <span className="text-slate-400 block mb-1">Donor Ref</span>
 <span className="font-mono text-slate-200 font-semibold">{unit.donorId}</span>
 </div>
 </div>

 {/* Infectious Marker Laboratory Certificate */}
 <div className="p-4 bg-slate-800/60 border border-slate-700/70 rounded-xl space-y-3">
 <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
 <div className="flex items-center gap-2">
 <ShieldCheck className="w-4 h-4 text-emerald-400" />
 <h4 className="font-bold text-xs text-white uppercase tracking-wider">Infectious Marker Screening</h4>
 </div>
 <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
 unit.testingStatus.overall === 'Passed' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
 }`}>
 {unit.testingStatus.overall}
 </span>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
 {['hiv', 'hbv', 'hcv', 'syphilis', 'malaria'].map((key) => {
 const val = unit.testingStatus[key as keyof typeof unit.testingStatus];
 return (
 <div key={key} className="p-2 rounded bg-slate-900 border border-slate-800 text-center">
 <span className="text-slate-400 uppercase font-bold text-[10px] block">{key}</span>
 <span className={`font-semibold ${val === 'Negative' ? 'text-emerald-400' : 'text-amber-400'}`}>
 {val}
 </span>
 </div>
 );
 })}
 </div>
 </div>

 {/* Current facility */}
 <div className="p-4 bg-slate-800/60 border border-slate-700/70 rounded-xl space-y-3 text-xs">
 <div className="flex items-center gap-2 text-white font-bold border-b border-slate-700/60 pb-2">
 <MapPin className="w-4 h-4 text-primary" />
 <span>Current Facility</span>
 </div>

 <div className="grid grid-cols-1 gap-4">
 <div>
 <span className="text-slate-400 block text-[11px]">Facility Name</span>
 <p className="font-semibold text-slate-200 mt-0.5">{unit.currentLocation.facilityName}</p>
 </div>
 {unit.crossMatchedPatientId && (
 <div>
 <span className="text-slate-400 block text-[11px]">Cross-matched Patient</span>
 <span className="font-bold text-amber-300 font-mono">{unit.crossMatchedPatientId}</span>
 </div>
 )}
 </div>
 </div>

 {/* Notes or remarks */}
 {unit.notes && (
 <div className="p-3 bg-slate-800/40 border border-slate-700/40 rounded-xl text-xs text-slate-300">
 <span className="text-slate-400 font-semibold block mb-1">Clinical Remarks</span>
 <p className="italic">{unit.notes}</p>
 </div>
 )}

 </div>

 {/* Modal Footer */}
 <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
 <span className="text-slate-400 font-mono">Verified DIN #{unit.id}</span>
 <Button variant="ghost" size="none"
 onClick={onClose}
 className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-colors"
 >
 Close
 </Button>
 </div>

 </div>
 </div>
 );
};
