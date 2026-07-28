import { Button } from '../ui/button';
import React, { useState } from 'react';
import { Select } from '../ui/select';
import { Input } from '../ui/input';
import { X, Building2, ShieldCheck, Mail, Phone, MapPin, CheckCircle2 } from 'lucide-react';
import { UserRole } from '../../types/blood';
import { toast } from 'sonner';

interface RegisterModalProps {
 isOpen: boolean;
 onClose: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose }) => {
 const [submitted, setSubmitted] = useState(false);
 const [role, setRole] = useState<UserRole>('blood_service_facility');
 const [formData, setFormData] = useState({
 facilityName: '',
 licenseNumber: '',
 email: '',
 phone: '',
 address: '',
 contactPerson: ''
 });

 if (!isOpen) return null;

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 setSubmitted(true);
 toast.success('Onboarding application submitted', {
 description: 'Your facility application is now queued for verification.',
 });
 };

 return (
 <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
 <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg text-slate-100 overflow-hidden">
 
 {/* Header */}
 <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Building2 className="w-5 h-5 text-primary" />
 <h3 className="font-bold text-base text-white">Facility Onboarding Request</h3>
 </div>
 <Button variant="ghost" size="none" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
 <X className="w-5 h-5" />
 </Button>
 </div>

 {submitted ? (
 <div className="p-8 text-center space-y-4">
 <div className="w-16 h-16 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full flex items-center justify-center mx-auto">
 <CheckCircle2 className="w-8 h-8" />
 </div>
 <h4 className="text-xl font-bold text-white">Onboarding Application Submitted!</h4>
 <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
 Your facility registration for <strong>{formData.facilityName || 'New Facility'}</strong> is currently under verification by the Regional Health Authority. Credentials will be dispatched to <strong>{formData.email}</strong> upon license validation.
 </p>
 <Button variant="ghost" size="none"
 onClick={() => {
 setSubmitted(false);
 onClose();
 }}
 className="mt-4 px-6 py-2.5 bg-primary hover:bg-primary text-white font-bold rounded-xl text-xs "
 >
 Return to Login Portal
 </Button>
 </div>
 ) : (
 <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
 <div>
 <label className="block font-semibold text-slate-300 mb-1">Operating Facility Type</label>
 <Select
 value={role}
 onChange={(e) => setRole(e.target.value as UserRole)}
 className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-medium focus:ring-2 focus:ring-primary"
 >
 <option value="blood_service_facility">Blood Station Facility (Clinic / Hospital Unit)</option>
 <option value="blood_bank">Blood Bank (Hospital or Standalone Storage)</option>
 <option value="blood_center">Blood Processing Center (Regional Collection Hub)</option>
 </Select>
 </div>

 <div>
 <label className="block font-semibold text-slate-300 mb-1">Official Facility Name</label>
 <Input
 type="text"
 required
 placeholder="e.g. St. Jude Regional Hospital"
 value={formData.facilityName}
 onChange={(e) => setFormData({ ...formData, facilityName: e.target.value })}
 className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-primary"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block font-semibold text-slate-300 mb-1">DOH/CDC License #</label>
 <Input
 type="text"
 required
 placeholder="e.g. BL-90812"
 value={formData.licenseNumber}
 onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
 className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500"
 />
 </div>
 <div>
 <label className="block font-semibold text-slate-300 mb-1">Contact Officer</label>
 <Input
 type="text"
 required
 placeholder="e.g. Dr. Jane Smith"
 value={formData.contactPerson}
 onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
 className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block font-semibold text-slate-300 mb-1">Official Email</label>
 <Input
 type="email"
 required
 placeholder="lab@facility.org"
 value={formData.email}
 onChange={(e) => setFormData({ ...formData, email: e.target.value })}
 className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500"
 />
 </div>
 <div>
 <label className="block font-semibold text-slate-300 mb-1">Phone Number</label>
 <Input
 type="tel"
 required
 placeholder="+1 (555) 000-0000"
 value={formData.phone}
 onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
 className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500"
 />
 </div>
 </div>

 <div>
 <label className="block font-semibold text-slate-300 mb-1">Physical Address / Location</label>
 <textarea
 rows={2}
 placeholder="Street address, district, coordinates..."
 value={formData.address}
 onChange={(e) => setFormData({ ...formData, address: e.target.value })}
 className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500"
 />
 </div>

 <div className="pt-2 flex justify-end gap-2">
 <Button variant="ghost" size="none"
 type="button"
 onClick={onClose}
 className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700"
 >
 Cancel
 </Button>
 <Button variant="ghost" size="none"
 type="submit"
 className="px-5 py-2 bg-primary hover:bg-primary text-white font-bold rounded-lg "
 >
 Submit Application
 </Button>
 </div>
 </form>
 )}

 </div>
 </div>
 );
};
