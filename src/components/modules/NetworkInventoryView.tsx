import { Button } from '../ui/button';
import React, { useMemo, useState } from 'react';
import { Building2, HeartPulse, Landmark, Search, Wifi } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBloodData } from '../../context/BloodDataContext';
import { BLOOD_COMPONENTS, BLOOD_GROUPS, getComponentLabel } from '../../lib/bloodCatalog';
import { UserRole } from '../../types/blood';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group';
import { formatNumber } from '../../lib/utils';

type NetworkFacilityStock = {
 id: string;
 name: string;
 role: UserRole;
 totalAvailableUnits: number;
 stockByComponent: Record<string, number>;
};

const roleLabel: Record<UserRole, string> = {
 blood_center: 'Blood Center',
 blood_bank: 'Blood Bank',
 blood_service_facility: 'Blood Station',
};

const roleIcon: Record<UserRole, React.ElementType> = {
 blood_center: Landmark,
 blood_bank: Building2,
 blood_service_facility: HeartPulse,
};

const stockKey = (bloodType: string, component: string) => `${bloodType}:${component}`;

export const NetworkInventoryView: React.FC = () => {
 const { user } = useAuth();
 const { bloodUnits } = useBloodData();
 const [component, setComponent] = useState(BLOOD_COMPONENTS[0]);
 const [query, setQuery] = useState('');

 const facilities = useMemo(() => {
 const stockByFacility = new Map<string, NetworkFacilityStock>();

 bloodUnits.forEach(unit => {
 if (unit.currentLocation.facilityId === user?.facilityCode || unit.status !== 'Available' || unit.testingStatus.overall !== 'Passed') return;

 const current = stockByFacility.get(unit.currentLocation.facilityId) || {
 id: unit.currentLocation.facilityId,
 name: unit.currentLocation.facilityName,
 role: unit.currentLocation.role,
 totalAvailableUnits: 0,
 stockByComponent: {},
 };
 current.totalAvailableUnits += 1;
 const key = stockKey(unit.bloodType, unit.component);
 current.stockByComponent[key] = (current.stockByComponent[key] || 0) + 1;
 stockByFacility.set(current.id, current);
 });

 return Array.from(stockByFacility.values())
 .filter(facility => facility.name.toLowerCase().includes(query.trim().toLowerCase()))
 .sort((left, right) => right.totalAvailableUnits - left.totalAvailableUnits || left.name.localeCompare(right.name));
 }, [bloodUnits, query, user?.facilityCode]);

 return (
 <div className="flex flex-col gap-6">
 <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
 <div className="grid md:grid-cols-[minmax(0,1fr)_auto]">
 <div className="p-5 md:p-6">
 <div className="mb-3 flex flex-wrap items-center gap-2">
 <span className="rounded-md bg-cyan-950 px-2 py-1 font-mono text-[10px] font-bold tracking-wide text-cyan-300">LIVE NETWORK</span>
 <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300"><Wifi className="size-3" /> Connected</span>
 </div>
 <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">Network Inventory</h2>
 <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">View requestable, cleared inventory at other blood centers, banks, and stations. Reserved and in-transit units are excluded.</p>
 </div>
 <div className="grid gap-px border-t border-slate-700 bg-slate-700 sm:grid-cols-2 md:border-t-0 lg:grid-cols-5">
 {BLOOD_COMPONENTS.map(item => <Button variant="ghost" size="none" key={item} type="button" aria-pressed={component === item} onClick={() => setComponent(item)} className={`flex min-h-32 items-center justify-center px-6 py-8 text-center text-sm font-bold transition-colors md:min-h-full ${component === item ? 'bg-cyan-950 text-cyan-100' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'}`}>{getComponentLabel(item)}</Button>)}
 </div>
 </div>
 </section>

 <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
 <InputGroup>
 <InputGroupInput value={query} onChange={event => setQuery(event.target.value)} placeholder="Search another facility" aria-label="Search network facilities" />
 <InputGroupAddon><Search /></InputGroupAddon>
 </InputGroup>
 </section>

 <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
 <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950 px-5 py-4">
 <div>
 <h3 className="font-bold text-white">Available {getComponentLabel(component)} units</h3>
 <p className="mt-1 text-xs text-slate-400">{formatNumber(facilities.length)} connected facilities · all quantities update from inventory events</p>
 </div>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full min-w-[900px] text-left text-xs">
 <thead className="border-b border-slate-800 bg-slate-900 font-mono text-[10px] uppercase tracking-wider text-slate-400">
 <tr>
 <th className="px-5 py-3">Facility</th>
 <th className="px-5 py-3">Type</th>
 {BLOOD_GROUPS.map(group => <th key={group} className="px-3 py-3 text-center">{group}</th>)}
 <th className="px-5 py-3 text-right">All available</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-800">
 {facilities.map(facility => {
 const Icon = roleIcon[facility.role];
 return <tr key={facility.id} className="transition-colors hover:bg-slate-800/40">
 <td className="px-5 py-4 font-semibold text-white"><span className="inline-flex items-center gap-2"><Icon className="size-4 text-cyan-300" />{facility.name}</span></td>
 <td className="px-5 py-4 text-slate-400">{roleLabel[facility.role]}</td>
 {BLOOD_GROUPS.map(group => <td key={group} className="px-3 py-4 text-center font-mono font-bold text-emerald-400">{formatNumber(facility.stockByComponent[stockKey(group, component)] || 0)}</td>)}
 <td className="px-5 py-4 text-right font-mono font-bold text-white">{formatNumber(facility.totalAvailableUnits)}</td>
 </tr>;
 })}
 {facilities.length === 0 && <tr><td colSpan={11} className="p-0"><Empty><EmptyHeader><EmptyMedia variant="icon"><Building2 /></EmptyMedia><EmptyTitle>No network stock found</EmptyTitle><EmptyDescription>There are no cleared, available units at another facility for this search.</EmptyDescription></EmptyHeader></Empty></td></tr>}
 </tbody>
 </table>
 </div>
 </section>
 </div>
 );
};
