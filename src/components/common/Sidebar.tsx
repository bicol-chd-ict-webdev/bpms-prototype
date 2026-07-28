import React from 'react';
import { 
 LayoutDashboard, 
 Droplets, 
 FlaskConical, 
 CalendarDays, 
 Truck, 
 AlertOctagon, 
 FileText, 
 Activity, 
 CheckSquare, 
 Layers, 
 Building2, 
 Users, 
 ClipboardList,
 Flame,
 ShieldCheck,
 Building,
 HeartHandshake,
 Stethoscope,
 LogOut,
 User,
 FileSpreadsheet,
 Moon,
 Monitor,
 Sun,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBloodData } from '../../context/BloodDataContext';
import { useTheme, type ThemeMode } from '../../context/ThemeContext';
import {
 Sidebar as ShadcnSidebar,
 SidebarContent,
 SidebarFooter,
 SidebarGroup,
 SidebarGroupContent,
 SidebarGroupLabel,
 SidebarHeader,
 SidebarMenu,
 SidebarMenuBadge,
 SidebarMenuButton,
 SidebarMenuItem,
 SidebarRail,
 SidebarTrigger,
} from '../ui/sidebar';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface SidebarProps {
 activeTab: string;
 setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
 const { currentRole, user, logout } = useAuth();
 const { requisitions, bloodUnits, donorDrives } = useBloodData();
 const { theme, resolvedTheme, setTheme } = useTheme();

 const pendingReqsCount = requisitions.filter(r => r.status === 'Pending Approval').length;
 const criticalStockCount = bloodUnits.filter(u => u.status === 'Available' && u.bloodType === 'O-').length;
 const activeDrivesCount = donorDrives.filter(d => d.status === 'Active Today').length;

 const getRoleHeader = () => {
 switch (currentRole) {
 case 'blood_center':
 return {
 title: 'Regional Center Console',
 subtitle: user?.facilityName || 'Blood Center',
 icon: Building,
 iconBg: 'bg-primary',
 };
 case 'blood_bank':
 return {
 title: 'Blood Bank Console',
 subtitle: user?.facilityName || 'Blood Bank',
 icon: HeartHandshake,
 iconBg: 'bg-amber-600',
 };
 case 'blood_service_facility':
 return {
 title: 'Clinical Facility Console',
 subtitle: user?.facilityName || 'Blood Station Facility',
 icon: Stethoscope,
 iconBg: 'bg-purple-600',
 };
 default:
 return {
 title: 'Blood Logistics',
 subtitle: 'System Control',
 icon: Building,
 iconBg: 'bg-slate-700',
 };
 }
 };

 const getRoleNavItems = () => {
 switch (currentRole) {
 case 'blood_center':
 return [
 { id: 'dashboard', label: 'Center Overview', icon: LayoutDashboard },
 { id: 'collections', label: 'Blood Collections', icon: FileSpreadsheet },
 { id: 'inventory', label: 'Blood Inventory', icon: Droplets },
 { id: 'blood_requests', label: 'Blood Requests', icon: ClipboardList, badge: pendingReqsCount > 0 ? `${pendingReqsCount}` : undefined, badgeBg: 'bg-amber-600' },
 ];

 case 'blood_bank':
 return [
 { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
 { id: 'inventory', label: 'Inventory', icon: Droplets, badge: criticalStockCount <= 2 ? 'Low O-' : undefined, badgeBg: 'bg-primary' },
 { id: 'blood_requests', label: 'Blood Request', icon: ClipboardList, badge: pendingReqsCount > 0 ? `${pendingReqsCount}` : undefined, badgeBg: 'bg-amber-600' },
 ];

 case 'blood_service_facility':
 return [
 { id: 'dashboard', label: 'Facility Dashboard', icon: LayoutDashboard },
 { id: 'inventory', label: 'Facility Inventory', icon: Droplets },
 { id: 'blood_requests', label: 'Blood Requests', icon: ClipboardList, badge: pendingReqsCount > 0 ? `${pendingReqsCount}` : undefined, badgeBg: 'bg-amber-600' },
 ];

 default:
 return [];
 }
 };

 const roleHeader = getRoleHeader();
 const navItems = getRoleNavItems();
 const HeaderIcon = roleHeader.icon;
 const ThemeIcon = theme === 'system' ? Monitor : resolvedTheme === 'light' ? Sun : Moon;
 const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
 { value: 'light', label: 'Light', icon: Sun },
 { value: 'dark', label: 'Dark', icon: Moon },
 { value: 'system', label: 'System', icon: Monitor },
 ];

 const cycleTheme = () => {
 const modes: ThemeMode[] = ['light', 'dark', 'system'];
 const nextMode = modes[(modes.indexOf(theme) + 1) % modes.length];
 setTheme(nextMode);
 };

 return (
 <ShadcnSidebar collapsible="icon" className="border-r border-slate-800 bg-slate-900 text-slate-100">
 
 {/* Sidebar Header with Role Info & Trigger */}
 <SidebarHeader className="p-3 border-b border-slate-800/80">
 <div className="flex items-center justify-between">
 <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
 <div className={`p-2 rounded-xl ${roleHeader.iconBg} text-white shrink-0 `}>
 <HeaderIcon className="w-4 h-4" />
 </div>
 <div className="min-w-0 group-data-[collapsible=icon]:hidden">
 <h4 className="truncate text-xs font-black leading-tight text-white">{roleHeader.title}</h4>
 <p className="max-w-48 truncate text-[10px] text-slate-400" title={roleHeader.subtitle}>{roleHeader.subtitle}</p>
 </div>
 </div>
 <SidebarTrigger />
 </div>
 </SidebarHeader>

 {/* Main Navigation Content */}
 <SidebarContent className="p-2">
 <SidebarGroup>
 <SidebarGroupLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
 Navigation Menu
 </SidebarGroupLabel>

 <SidebarGroupContent>
 <SidebarMenu>
 {navItems.map((item) => {
 const Icon = item.icon;
 const isActive = activeTab === item.id;

 return (
 <SidebarMenuItem key={item.id}>
 <SidebarMenuButton
 isActive={isActive}
 onClick={() => setActiveTab(item.id)}
 tooltip={item.label}
 >
 <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
 <span className="truncate group-data-[collapsible=icon]:hidden">{item.label}</span>

 {item.badge && (
 <SidebarMenuBadge className={item.badgeBg || 'bg-primary'}>
 {item.badge}
 </SidebarMenuBadge>
 )}
 </SidebarMenuButton>
 </SidebarMenuItem>
 );
 })}
 </SidebarMenu>
 </SidebarGroupContent>
 </SidebarGroup>

 </SidebarContent>

 {/* Footer User Info & Logout */}
 <SidebarFooter className="p-3 border-t border-slate-800 space-y-2">
 <aside className="rounded-lg border border-emerald-900/60 bg-emerald-950/20 px-2.5 py-2.5 group-data-[collapsible=icon]:hidden">
 <div className="flex items-center gap-2">
 <Activity className="text-emerald-400" />
 <div className="min-w-0">
 <p className="text-[11px] font-bold text-emerald-100">Traceability protocol</p>
 <p className="mt-0.5 text-[10px] leading-relaxed text-emerald-200/65">RFID and DIN verification are active.</p>
 </div>
 </div>
 </aside>

 <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
 <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:hidden">
 <div className="flex items-center gap-2">
 <ThemeIcon className="shrink-0 text-cyan-400" />
 <div>
 <p className="text-[11px] font-semibold text-slate-100">Appearance</p>
 <p className="text-[10px] text-slate-500">Choose your display mode</p>
 </div>
 </div>
 <span className="rounded-md border border-cyan-900/60 bg-cyan-950/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-cyan-300">Theme</span>
 </div>

 <div role="group" aria-label="Display mode" className="mt-2 flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/70 p-1 group-data-[collapsible=icon]:hidden">
 {themeOptions.map((option) => {
 const OptionIcon = option.icon;
 const isActive = theme === option.value;

 return (
 <Button
 key={option.value}
 type="button"
 variant="ghost"
 size="sm"
 aria-pressed={isActive}
 onClick={() => setTheme(option.value)}
 className={cn(
 'h-8 flex-1 gap-1.5 px-2 text-[11px] font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100',
 isActive && 'bg-slate-800 text-cyan-300 hover:bg-slate-800 hover:text-cyan-300',
 )}
 >
 <OptionIcon data-icon="inline-start" />
 {option.label}
 </Button>
 );
 })}
 </div>

 <Button
 type="button"
 onClick={cycleTheme}
 variant="ghost"
 size="icon"
 className="hidden text-slate-300 hover:bg-slate-800 hover:text-cyan-300 group-data-[collapsible=icon]:flex"
 title={`Theme: ${theme}. Click to change.`}
 aria-label={`Theme: ${theme}. Click to change.`}
 >
 <ThemeIcon />
 </Button>
 </div>
 {user && (
 <div className="flex items-center justify-between gap-2 overflow-hidden px-1">
 <div className="flex items-center gap-2 min-w-0">
 <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
 <User className="w-3.5 h-3.5 text-slate-300" />
 </div>
 <div className="min-w-0 group-data-[collapsible=icon]:hidden">
 <p className="text-xs font-bold text-white truncate leading-tight">{user.name}</p>
 <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
 </div>
 </div>
 
 <Button variant="ghost" size="none"
 onClick={logout}
 title="Log Out"
 className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-800 transition-colors shrink-0 group-data-[collapsible=icon]:mx-auto"
 >
 <LogOut className="w-4 h-4" />
 </Button>
 </div>
 )}

 <div className="flex items-center justify-between text-[11px] text-slate-400 group-data-[collapsible=icon]:justify-center pt-1 border-t border-slate-800/60">
 <span className="font-mono text-[10px] group-data-[collapsible=icon]:hidden">CDC / DOH Compliant</span>
 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="System Live" />
 </div>
 </SidebarFooter>

 <SidebarRail />
 </ShadcnSidebar>
 );
};
