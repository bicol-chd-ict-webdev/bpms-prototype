import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, CheckCircle2, ChevronRight, Droplet, HeartPulse, Landmark, MapPin, Plus, Search, Send, Settings, ShoppingCart, Trash2, Truck, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBloodData } from '../../context/BloodDataContext';
import { RHLN_FACILITY_DATA_SOURCE, RHLN_FACILITIES } from '../../data/rhlnFacilityDirectory';
import { DEMO_USERS } from '../../data/mockData';
import { BloodComponentType, FullBloodType, RequisitionItem, UserRole } from '../../types/blood';
import { getBloodTypeStockLevel, isRedCellComponent } from '../../lib/bloodStockLevel';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group';

import { Provider, RequestItem, RequestPath, ROLE_DETAILS, BLOOD_GROUPS, PROVIDERS_PER_PAGE, calculateDistanceKm, estimatedTravelTime, normalizeFacilityName, productKey, providerDistanceLabel, providerLocationLabel } from './facility-blood-request/shared';
import { FacilityStockRequestModal, ProductFirstBatchSearch, ProductFirstConfirmationModal, ProductFirstFacilitySearch, RequestPathSelector } from './facility-blood-request/RequestFlows';

interface FacilityBloodRequestModalProps {
 isOpen: boolean;
 onClose: () => void;
}

export const FacilityBloodRequestModal: React.FC<FacilityBloodRequestModalProps> = ({ isOpen, onClose }) => {
 const { user } = useAuth();
 const { bloodUnits } = useBloodData();
 const [providerQuery, setProviderQuery] = useState('');
 const [providerRole, setProviderRole] = useState<UserRole | 'all'>('all');
 const [providerPage, setProviderPage] = useState(1);
 const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
 const [requestPath, setRequestPath] = useState<RequestPath>('product');
 const [prefilledItems, setPrefilledItems] = useState<RequestItem[]>([]);

 const providers = useMemo<Provider[]>(() => {
 const requesterName = normalizeFacilityName(user?.facilityName || '');
 const requesterDirectoryRecord = RHLN_FACILITIES.find(facility => normalizeFacilityName(facility.name) === requesterName);
 const directoryFacilitiesByName = new Map(RHLN_FACILITIES.map(facility => [normalizeFacilityName(facility.name), facility]));
 const facilities = new Map<string, {
 id: string;
 name: string;
 role: UserRole;
 inventoryReported: boolean;
 province?: string;
 address?: string;
 latitude?: number | null;
 longitude?: number | null;
 directorySource?: string;
 }>();
 RHLN_FACILITIES.forEach(facility => {
 const normalizedName = normalizeFacilityName(facility.name);
 if (normalizedName === requesterName) return;
 facilities.set(normalizedName, {
 id: facility.id,
 name: facility.name,
 role: 'blood_service_facility',
 inventoryReported: false,
 province: facility.province,
 address: facility.address,
 latitude: facility.latitude,
 longitude: facility.longitude,
 directorySource: RHLN_FACILITY_DATA_SOURCE,
 });
 });

 const unitsByFacility = bloodUnits.reduce<Map<string, typeof bloodUnits>>((groups, unit) => {
 const units = groups.get(unit.currentLocation.facilityId) || [];
 units.push(unit);
 groups.set(unit.currentLocation.facilityId, units);
 return groups;
 }, new Map());

 unitsByFacility.forEach((units, facilityId) => {
 const knownFacility = DEMO_USERS.find(profile => profile.facilityCode === facilityId);
 const matchingDirectoryRecord = [knownFacility?.facilityName, ...units.map(unit => unit.currentLocation.facilityName)]
 .filter((name): name is string => Boolean(name))
 .map(name => directoryFacilitiesByName.get(normalizeFacilityName(name)))
 .find((facility): facility is NonNullable<typeof facility> => Boolean(facility));
 const facilityName = matchingDirectoryRecord?.name || knownFacility?.facilityName || units[0].currentLocation.facilityName;
 const normalizedName = normalizeFacilityName(facilityName);

 if (facilityId === user?.facilityCode || normalizedName === requesterName) return;

 facilities.set(normalizedName, {
 id: facilityId,
 name: facilityName,
 role: units[0].currentLocation.role,
 inventoryReported: true,
 province: matchingDirectoryRecord?.province,
 address: matchingDirectoryRecord?.address,
 latitude: matchingDirectoryRecord?.latitude,
 longitude: matchingDirectoryRecord?.longitude,
 directorySource: matchingDirectoryRecord ? RHLN_FACILITY_DATA_SOURCE : undefined,
 });
 });

 return Array.from(facilities.values()).map(facility => {
 const availableUnits = bloodUnits.filter(unit =>
 unit.currentLocation.facilityId === facility.id &&
 unit.status === 'Available' &&
 unit.testingStatus.overall === 'Passed'
 );
 const inventoryByProduct = availableUnits.reduce<Record<string, number>>((stock, unit) => {
 const key = productKey(unit.bloodType, unit.component);
 stock[key] = (stock[key] || 0) + 1;
 return stock;
 }, {});
 const distanceKm = requesterDirectoryRecord?.latitude !== null && requesterDirectoryRecord?.latitude !== undefined && requesterDirectoryRecord?.longitude !== null && requesterDirectoryRecord?.longitude !== undefined && facility.latitude !== null && facility.latitude !== undefined && facility.longitude !== null && facility.longitude !== undefined
 ? calculateDistanceKm(requesterDirectoryRecord.latitude, requesterDirectoryRecord.longitude, facility.latitude, facility.longitude)
 : null;
 return {
 ...facility,
 distanceKm,
 eta: estimatedTravelTime(distanceKm),
 networkScope: facility.province === requesterDirectoryRecord?.province ? 'province' : 'region',
 totalAvailableUnits: availableUnits.length,
 inventoryByProduct,
 };
 }).sort((left, right) => {
 if (left.distanceKm === null) return 1;
 if (right.distanceKm === null) return -1;
 return left.distanceKm - right.distanceKm;
 });
 }, [bloodUnits, user?.facilityCode, user?.facilityName]);

 const filteredProviders = useMemo(() => providers.filter(provider =>
 provider.name.toLowerCase().includes(providerQuery.toLowerCase()) &&
 (providerRole === 'all' || provider.role === providerRole)
 ), [providerQuery, providerRole, providers]);
 const totalPages = Math.max(1, Math.ceil(filteredProviders.length / PROVIDERS_PER_PAGE));
 const visibleProviders = filteredProviders.slice((providerPage - 1) * PROVIDERS_PER_PAGE, providerPage * PROVIDERS_PER_PAGE);
 const selectedProvider = providers.find(provider => provider.id === selectedProviderId) || null;

 useEffect(() => {
 setProviderPage(1);
 }, [providerQuery, providerRole]);

 useEffect(() => {
 if (!isOpen) {
 setSelectedProviderId(null);
 setProviderQuery('');
 setProviderRole('all');
 setProviderPage(1);
 setRequestPath('product');
 setPrefilledItems([]);
 }
 }, [isOpen]);

 if (!isOpen || user?.role === 'blood_center') return null;

 if (requestPath === 'product') {
 return (
 <>
 <ProductFirstFacilitySearch
 providers={providers}
 onBack={onClose}
 onClose={onClose}
 onSelect={(provider, item) => {
 setPrefilledItems([item]);
 setSelectedProviderId(provider.id);
 }}
 />
 {selectedProvider && <ProductFirstConfirmationModal provider={selectedProvider} items={prefilledItems} onBack={() => setSelectedProviderId(null)} onComplete={onClose} />}
 </>
 );
 }

 return (
 <>
 <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
 <div className="my-4 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 ">
 <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
 <div className="flex items-center gap-2.5">
 <Button variant="ghost" size="none" type="button" onClick={() => setRequestPath('choose')} aria-label="Back to request options" className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"><ArrowLeft className="size-4" /></Button>
 <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-white"><MapPin className="size-4" /></div>
 <div>
 <h3 className="text-base font-bold text-white">Choose a Nearby Facility</h3>
 <p className="text-xs text-slate-400">Facilities are ranked by shortest distance. Select one to view its available inventory.</p>
 </div>
 </div>
 <Button variant="ghost" size="none" type="button" onClick={onClose} aria-label="Close facility picker" className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"><X className="size-5" /></Button>
 </div>

 <div className="flex-1 overflow-y-auto p-6 text-xs">
 <div className="mb-4 flex flex-col gap-2 sm:flex-row">
 <InputGroup className="h-10 flex-1">
 <InputGroupInput value={providerQuery} onChange={event => setProviderQuery(event.target.value)} placeholder="Search nearby facility" aria-label="Search nearby facilities" className="text-xs" />
 <InputGroupAddon><Search /></InputGroupAddon>
 </InputGroup>
 <Select value={providerRole} onChange={event => setProviderRole(event.target.value as UserRole | 'all')} aria-label="Filter facility type" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-500">
 <option value="all">All facility types</option>
 <option value="blood_center">Blood centers</option>
 <option value="blood_bank">Blood banks</option>
 <option value="blood_service_facility">Service facilities</option>
 </Select>
 </div>
 <div className="mb-3 flex items-center justify-between text-[10px] text-slate-500"><span>{filteredProviders.length} nearby facilities</span><span>Nearest first</span></div>
 <div className="flex flex-col gap-3">
 {visibleProviders.map(provider => {
 const role = ROLE_DETAILS[provider.role];
 const RoleIcon = role.icon;
 return (
 <Button variant="ghost" size="none" key={provider.id} type="button" disabled={provider.totalAvailableUnits === 0} onClick={() => { setPrefilledItems([]); setSelectedProviderId(provider.id); }} className="flex w-full justify-start whitespace-normal rounded-xl border border-slate-700 bg-slate-950 p-4 text-left transition-colors hover:border-cyan-500 hover:bg-slate-800/40 disabled:cursor-not-allowed disabled:opacity-50">
 <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
 <div className="flex items-start gap-3">
 <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${role.tone}`}><RoleIcon className="size-4" /></div>
 <div>
 <div className="flex flex-wrap items-center gap-2"><span className="font-bold text-white">{provider.name}</span><span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${role.tone}`}>{role.label}</span></div>
 <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-400"><span>{providerDistanceLabel(provider)}</span><span>{providerLocationLabel(provider)}</span><span className="flex items-center gap-1"><Truck className="size-3" />{provider.eta}</span></div>
 </div>
 </div>
 <div className="flex items-center gap-3 self-end sm:self-auto"><div className="text-right"><div className="font-mono text-lg font-black text-emerald-400">{provider.totalAvailableUnits}</div><div className="text-[10px] text-slate-400">available units</div></div><ChevronRight className="size-4 text-slate-500" /></div>
 </div>
 </Button>
 );
 })}
 {visibleProviders.length === 0 && <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-slate-500">No nearby facilities match the current search.</div>}
 </div>
 </div>

 {filteredProviders.length > PROVIDERS_PER_PAGE && <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-6 py-3 text-xs"><span className="text-slate-400">Page {providerPage} of {totalPages}</span><div className="flex gap-2"><Button variant="ghost" size="none" type="button" disabled={providerPage === 1} onClick={() => setProviderPage(page => page - 1)} className="rounded-lg bg-slate-800 px-3 py-1.5 text-slate-300 disabled:opacity-40">Previous</Button><Button variant="ghost" size="none" type="button" disabled={providerPage === totalPages} onClick={() => setProviderPage(page => page + 1)} className="rounded-lg bg-slate-800 px-3 py-1.5 text-slate-300 disabled:opacity-40">Next</Button></div></div>}
 </div>
 </div>

 {selectedProvider && <FacilityStockRequestModal provider={selectedProvider} initialItems={prefilledItems} onBack={() => setSelectedProviderId(null)} onComplete={onClose} />}
 </>
 );
};
