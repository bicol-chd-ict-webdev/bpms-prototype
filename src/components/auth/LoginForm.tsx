import { Button } from '../ui/button';
import React, { useState } from 'react';
import { Input } from '../ui/input';
import { 
 Droplet, 
 Building2, 
 ShieldCheck, 
 KeyRound, 
 Mail, 
 ArrowRight, 
 Sparkles, 
 CheckCircle2, 
 Users, 
 HelpCircle,
 Activity
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/blood';
import { RegisterModal } from './RegisterModal';

export const LoginForm: React.FC = () => {
 const { login, demoUsers } = useAuth();
 const [selectedRole, setSelectedRole] = useState<UserRole>('blood_bank');
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [securityPin, setSecurityPin] = useState('');
 const [showRegisterModal, setShowRegisterModal] = useState(false);

 const activeDemoUser = demoUsers.find(u => u.role === selectedRole);

 const rolesConfig: {
 id: UserRole;
 title: string;
 icon: string;
 badge: string;
 tagline: string;
 features: string[];
 }[] = [
 {
 id: 'blood_center',
 title: 'Blood Center',
 icon: '🩸',
 badge: 'Regional Hub',
 tagline: 'Regional donor drives, infectious disease testing, component separation & bulk distribution.',
 features: ['Donor Drive Scheduling', 'Lab Marker Screening (HIV/HBV)', 'PRBC/FFP Component Processing', 'Bulk Dispatch Logs']
 },
 {
 id: 'blood_bank',
 title: 'Blood Bank',
 icon: '🏥',
 badge: 'Storage & Issuance',
 tagline: 'Hospital cold chain storage, cross-matching queue, emergency inventory, and facility requisition fulfillment.',
 features: ['Cold Storage Sensors (2-6°C)', 'Cross-Matching Queue', 'Requisition Approvals', 'Expiry & Quarantine Management']
 },
 {
 id: 'blood_service_facility',
 title: 'Blood Station Facility',
 icon: '🚑',
 badge: 'Clinical Unit',
 tagline: 'Emergency trauma clinics & hospital wards submitting STAT blood requisitions and logging transfusions.',
 features: ['Emergency STAT Orders', 'Patient Transfusion Tracker', 'On-Hand Emergency Stock', 'Chain-of-Custody Verification']
 }
 ];

 const handleManualLogin = (e: React.FormEvent) => {
 e.preventDefault();
 login(selectedRole, email || activeDemoUser?.email);
 };

 const handleQuickDemoLogin = (role: UserRole) => {
 login(role);
 };

 return (
 <div className="min-h-screen bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(185,28,28,0.16),rgba(255,255,255,0))] flex flex-col justify-between p-4 sm:p-6 lg:p-8 text-foreground">
 
 {/* Top Header branding */}
 <div className="max-w-7xl mx-auto w-full flex items-center justify-between py-2">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary flex items-center justify-center ring-1 ring-primary/30">
 <Droplet className="w-6 h-6 text-white fill-white" />
 </div>
 <div>
 <h1 className="font-extrabold text-lg tracking-tight text-foreground font-mono">BPMS PORTAL</h1>
 <p className="text-xs text-muted-foreground">National Blood Product Management System</p>
 </div>
 </div>

 <Button variant="ghost" size="none"
 onClick={() => setShowRegisterModal(true)}
 className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-card hover:bg-muted border border-border text-foreground transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 <Building2 className="w-3.5 h-3.5 text-primary" />
 <span>Onboard New Facility</span>
 </Button>
 </div>

 {/* Main Login Card Container */}
 <div className="max-w-5xl mx-auto w-full my-auto py-8">
 
 {/* Title banner */}
 <div className="text-center space-y-2 mb-8">
 <span className="px-3 py-1 rounded-full bg-primary border border-primary text-primary-foreground text-xs font-mono font-bold tracking-wider inline-block">
 AUTHENTICATION & ROLE SELECTION
 </span>
 <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
 Select Your Operating Role
 </h2>
 <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
 Access secure blood chain metrics, cross-matching queues, and emergency requisitions tailored to your accredited facility role.
 </p>
 </div>

 {/* 3 Role Selection Tabs */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
 {rolesConfig.map((cfg) => {
 const isSelected = selectedRole === cfg.id;
 return (
 <div
 key={cfg.id}
 onClick={() => setSelectedRole(cfg.id)}
 className={`p-5 rounded-2xl cursor-pointer border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
 isSelected
 ? 'bg-card border-primary ring-1 ring-primary/40 shadow-sm'
 : 'bg-card/80 hover:bg-card border-border hover:border-primary/40'
 }`}
 >
 {isSelected && (
 <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
 )}

 <div>
 <div className="flex items-center justify-between mb-3">
 <span className="text-3xl">{cfg.icon}</span>
 <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
 isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
 }`}>
 {cfg.badge}
 </span>
 </div>

 <h3 className="font-bold text-lg text-card-foreground mb-1">{cfg.title}</h3>
 <p className="text-xs text-muted-foreground leading-relaxed mb-4">{cfg.tagline}</p>

 <ul className="space-y-1.5 text-[11px] text-muted-foreground mb-6">
 {cfg.features.map((feat, idx) => (
 <li key={idx} className="flex items-center gap-1.5">
 <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground/70'}`} />
 <span>{feat}</span>
 </li>
 ))}
 </ul>
 </div>

 {/* Quick Switch / Login CTA inside Card */}
 <Button variant="ghost" size="none"
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 handleQuickDemoLogin(cfg.id);
 }}
 className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
 isSelected
 ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
 : 'bg-muted hover:bg-accent text-foreground'
 }`}
 >
 <span>Log In as {cfg.title}</span>
 <ArrowRight className="w-4 h-4" />
 </Button>
 </div>
 );
 })}
 </div>

 {/* Selected Role Credentials Form */}
 <div className="bg-card/90 border border-border rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto backdrop-blur-md shadow-sm">
 
 <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 mb-6 gap-2">
 <div>
 <div className="flex items-center gap-2">
 <ShieldCheck className="w-5 h-5 text-primary" />
 <h3 className="font-bold text-base text-card-foreground">
 Credentials for {rolesConfig.find(r => r.id === selectedRole)?.title}
 </h3>
 </div>
 <p className="text-xs text-muted-foreground mt-0.5">
 Active Demo Facility: <span className="text-card-foreground font-semibold">{activeDemoUser?.facilityName}</span>
 </p>
 </div>

 <Button variant="ghost" size="none"
 onClick={() => handleQuickDemoLogin(selectedRole)}
 className="px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-900 transition-colors shrink-0"
 >
 <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
 <span>1-Click Demo Sign In</span>
 </Button>
 </div>

 <form onSubmit={handleManualLogin} className="space-y-4 text-xs">
 
 <div>
 <label className="block text-foreground font-semibold mb-1">Facility Email Address</label>
 <div className="relative">
 <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
 <Input
 type="email"
 value={email || activeDemoUser?.email || ''}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="facility.lab@bloodsystem.gov"
 className="w-full bg-background border border-input rounded-xl pl-9 pr-4 py-2.5 text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-foreground font-semibold mb-1">Passcode / Password</label>
 <div className="relative">
 <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
 <Input
 type="password"
 value={password || '••••••••••••'}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="••••••••"
 className="w-full bg-background border border-input rounded-xl pl-9 pr-4 py-2.5 text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary"
 />
 </div>
 </div>

 <div>
 <label className="block text-foreground font-semibold mb-1">Security PIN / License</label>
 <div className="relative">
 <Activity className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
 <Input
 type="text"
 value={securityPin || activeDemoUser?.licenseNumber || ''}
 onChange={(e) => setSecurityPin(e.target.value)}
 placeholder="e.g. BL-REG-882910"
 className="w-full bg-background border border-input rounded-xl pl-9 pr-4 py-2.5 text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary"
 />
 </div>
 </div>
 </div>

 <div className="pt-2 flex items-center justify-between text-muted-foreground">
 <label className="flex items-center gap-2 cursor-pointer">
 <Input type="checkbox" defaultChecked className="rounded border-input text-primary" />
 <span>Remember facility authorization on this browser</span>
 </label>
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => setShowRegisterModal(true)}
 className="text-primary hover:underline"
 >
 Forgot PIN?
 </Button>
 </div>

 <Button variant="ghost" size="none"
 type="submit"
 className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
 >
 <Droplet className="w-4 h-4 fill-white" />
 <span>Authorize & Enter Dashboard</span>
 </Button>

 </form>

 </div>

 </div>

 {/* Footer */}
 <div className="max-w-7xl mx-auto w-full text-center py-4 border-t border-border text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
 <p>© 2026 Blood Product Management System (BPMS). All Rights Reserved.</p>
 <p className="font-mono text-[11px]">HIPAA & CDC Blood Safety Protocol Certified</p>
 </div>

 {/* Register Modal */}
 <RegisterModal
 isOpen={showRegisterModal}
 onClose={() => setShowRegisterModal(false)}
 />

 </div>
 );
};
