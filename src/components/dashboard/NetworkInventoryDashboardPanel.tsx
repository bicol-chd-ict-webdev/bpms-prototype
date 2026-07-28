import { Button } from '../ui/button';
import React, { useMemo, useState } from 'react';
import { Activity, Building2, HeartPulse, Landmark, Wifi } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBloodData } from '../../context/BloodDataContext';
import { BLOOD_COMPONENTS, BLOOD_GROUPS, getComponentLabel } from '../../lib/bloodCatalog';
import { getBloodComponentStockLevel } from '../../lib/bloodStockLevel';
import { formatNumber } from '../../lib/utils';
import { BloodComponentType, UserRole } from '../../types/blood';

type FacilityAvailability = {
 id: string;
 name: string;
 role: UserRole;
 stockByBloodGroup: Record<string, number>;
 total: number;
};

const roleIcon: Record<UserRole, React.ElementType> = {
 blood_center: Landmark,
 blood_bank: Building2,
 blood_service_facility: HeartPulse,
};

const componentKey = (bloodType: string, component: BloodComponentType) => `${bloodType}:${component}`;

const stockLevelClass = {
 critical: 'text-primary',
 low: 'text-amber-400',
 stable: 'text-emerald-400',
} as const;

export const NetworkInventoryDashboardPanel: React.FC = () => {
 const { user } = useAuth();
 const { bloodUnits } = useBloodData();
 const [component, setComponent] = useState<BloodComponentType>('Packed Red Blood Cells (PRBC)');

 const availability = useMemo(() => {
 const facilities = new Map<string, FacilityAvailability>();

 bloodUnits.forEach(unit => {
 if (
 unit.currentLocation.facilityId === user?.facilityCode
 || unit.status !== 'Available'
 || unit.testingStatus.overall !== 'Passed'
 || unit.component !== component
 ) return;

 const facility = facilities.get(unit.currentLocation.facilityId) || {
 id: unit.currentLocation.facilityId,
 name: unit.currentLocation.facilityName,
 role: unit.currentLocation.role,
 stockByBloodGroup: {},
 total: 0,
 };
 facility.stockByBloodGroup[unit.bloodType] = (facility.stockByBloodGroup[unit.bloodType] || 0) + 1;
 facility.total += 1;
 facilities.set(facility.id, facility);
 });

 return Array.from(facilities.values()).sort((left, right) => right.total - left.total || left.name.localeCompare(right.name));
 }, [bloodUnits, component, user?.facilityCode]);

 return (
 <section className="overflow-hidden rounded-2xl border border-cyan-900/70 bg-slate-900">
 <div className="grid border-b border-slate-800 bg-slate-950 md:grid-cols-[minmax(0,1fr)_auto]">
 <div className="px-5 py-4">
 <div className="flex items-start gap-3">
 <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-950 text-cyan-300"><Wifi className="size-5" /></div>
 <div>
 <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-white">Network availability</h3><span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300"><Activity className="size-3" /> Live</span></div>
 <p className="mt-1 text-xs text-slate-400">Requestable, cleared stock at connected partner facilities.</p>
 </div>
 </div>
 </div>
 <div className="grid gap-px border-t border-slate-700 bg-slate-700 sm:grid-cols-2 md:border-t-0 lg:grid-cols-5">
 {BLOOD_COMPONENTS.map(item => <Button variant="ghost" size="none" key={item} type="button" aria-pressed={component === item} onClick={() => setComponent(item)} className={`flex min-h-28 items-center justify-center px-5 py-6 text-center text-sm font-bold transition-colors md:min-h-full ${component === item ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'}`}>{getComponentLabel(item)}</Button>)}
 </div>
 </div>

 <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-800 bg-slate-950/60 px-5 py-2.5 text-[10px] font-medium">
 <span className="text-slate-500">Per-facility stock status</span>
 <span className="inline-flex items-center gap-1.5 text-primary"><span className="size-1.5 rounded-full bg-primary" />Critical</span>
 <span className="inline-flex items-center gap-1.5 text-amber-400"><span className="size-1.5 rounded-full bg-amber-400" />Low</span>
 <span className="inline-flex items-center gap-1.5 text-emerald-400"><span className="size-1.5 rounded-full bg-emerald-400" />Stable</span>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full min-w-[800px] text-left text-xs">
 <thead className="bg-slate-900 font-mono text-[9px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Top 5 partner facilities</th>{BLOOD_GROUPS.map(group => <th key={group} className="px-2 py-3 text-center">{group}</th>)}<th className="px-5 py-3 text-right">Total</th></tr></thead>
 <tbody className="divide-y divide-slate-800">
 {availability.slice(0, 5).map(facility => {
 const Icon = roleIcon[facility.role];
 return <tr key={facility.id} className="transition-colors hover:bg-slate-800/40"><td className="px-5 py-3.5"><span className="inline-flex items-center gap-2 font-semibold text-white"><Icon className="size-4 text-cyan-300" />{facility.name}</span></td>{BLOOD_GROUPS.map(group => {
 const count = facility.stockByBloodGroup[group] || 0;
 const stockLevel = getBloodComponentStockLevel(group, component, count);
 return <td key={group} title={`${group}: ${formatNumber(count)} ${stockLevel} ${getComponentLabel(component)} stock`} className={`px-2 py-3.5 text-center font-mono font-bold ${stockLevelClass[stockLevel]}`}>{formatNumber(count)}</td>;
 })}<td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-400">{formatNumber(facility.total)}</td></tr>;
 })}
 {availability.length === 0 && <tr><td colSpan={10} className="px-5 py-8 text-center text-slate-500">No other facility currently reports cleared, available {getComponentLabel(component)} stock.</td></tr>}
 </tbody>
 </table>
 </div>
 </section>
 );
};
