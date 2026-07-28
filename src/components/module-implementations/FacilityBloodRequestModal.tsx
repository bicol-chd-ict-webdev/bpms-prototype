import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, CheckCircle2, ChevronRight, Droplet, HeartPulse, Landmark, MapPin, Plus, Search, Send, Settings, ShoppingCart, Trash2, Truck, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBloodData } from '../../context/BloodDataContext';
import { RHLN_FACILITY_DATA_SOURCE, RHLN_FACILITIES } from '../../data/rhlnFacilityDirectory';
import { DEMO_USERS } from '../../data/mockData';
import { BloodComponentType, FullBloodType, RequisitionItem, UserRole } from '../../types/blood';
import { getBloodComponentStockLevel } from '../../lib/bloodStockLevel';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group';

interface FacilityBloodRequestModalProps {
 isOpen: boolean;
 onClose: () => void;
}

type Provider = {
 id: string;
 name: string;
 role: UserRole;
 distanceKm: number | null;
 eta: string;
 totalAvailableUnits: number;
 inventoryByProduct: Record<string, number>;
 networkScope: 'province' | 'region';
 inventoryReported: boolean;
 province?: string;
 address?: string;
 latitude?: number | null;
 longitude?: number | null;
 directorySource?: string;
};

type RequestItem = {
 bloodType: FullBloodType;
 component: BloodComponentType;
 quantity: number;
};

type RequestPath = 'choose' | 'facility' | 'product';

const ROLE_DETAILS: Record<UserRole, { label: string; icon: React.ElementType; tone: string }> = {
 blood_center: { label: 'Blood Center', icon: Landmark, tone: 'border-primary bg-primary text-white' },
 blood_bank: { label: 'Blood Bank', icon: Building2, tone: 'border-amber-800 bg-amber-950 text-amber-300' },
 blood_service_facility: { label: 'Blood Station Facility', icon: HeartPulse, tone: 'border-purple-800 bg-purple-950 text-purple-300' },
};

const BLOOD_GROUPS: FullBloodType[] = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
const COMPONENTS: { label: string; value: BloodComponentType }[] = [
 { label: 'PRBC', value: 'Packed Red Blood Cells (PRBC)' },
 { label: 'FFP', value: 'Fresh Frozen Plasma (FFP)' },
 { label: 'PLT', value: 'Platelet Concentrate' },
 { label: 'CRYO', value: 'Cryoprecipitate' },
 { label: 'WB', value: 'Whole Blood' },
];
const PROVIDERS_PER_PAGE = 8;
const productKey = (bloodType: FullBloodType, component: BloodComponentType) => `${bloodType}:${component}`;
const normalizeFacilityName = (name: string) => name.toUpperCase().replace(/[^A-Z0-9]/g, '');
const calculateDistanceKm = (originLatitude: number, originLongitude: number, destinationLatitude: number, destinationLongitude: number) => {
 const toRadians = (value: number) => value * Math.PI / 180;
 const latitudeDifference = toRadians(destinationLatitude - originLatitude);
 const longitudeDifference = toRadians(destinationLongitude - originLongitude);
 const distanceFactor = Math.sin(latitudeDifference / 2) ** 2
 + Math.cos(toRadians(originLatitude)) * Math.cos(toRadians(destinationLatitude)) * Math.sin(longitudeDifference / 2) ** 2;
 return Math.round(6_371 * 2 * Math.atan2(Math.sqrt(distanceFactor), Math.sqrt(1 - distanceFactor)) * 10) / 10;
};
const estimatedTravelTime = (distanceKm: number | null) => distanceKm === null
 ? 'Availability not reported'
 : `~${Math.max(5, Math.round(distanceKm / 30 * 60))} min`;
const providerDistanceLabel = (provider: Provider) => provider.distanceKm === null ? 'Distance not reported' : `${provider.distanceKm} km away`;
const providerCoordinatesLabel = (provider: Provider) => (
 provider.latitude === null || provider.latitude === undefined || provider.longitude === null || provider.longitude === undefined
 ? 'Coordinates not reported'
 : `${provider.latitude.toFixed(5)}, ${provider.longitude.toFixed(5)}`
);
const providerLocationLabel = (provider: Provider) => [provider.province, providerCoordinatesLabel(provider)].filter(Boolean).join(' · ');
const providerTypeLabel = (provider: Provider) => provider.inventoryReported ? ROLE_DETAILS[provider.role].label : 'Directory facility';
const providerBloodComponentStockLevel = (provider: Provider, bloodType: FullBloodType, component: BloodComponentType) => getBloodComponentStockLevel(
 bloodType,
 component,
 provider.inventoryByProduct[productKey(bloodType, component)] || 0,
);
const providerCanReceiveRequest = (provider: Provider, items: RequestItem[]) => !provider.inventoryReported || items.every(item => {
 const availableUnits = provider.inventoryByProduct[productKey(item.bloodType, item.component)] || 0;
 return availableUnits >= item.quantity
 && providerBloodComponentStockLevel(provider, item.bloodType, item.component) !== 'critical';
});

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

 if (!isOpen) return null;

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

const RequestPathSelector: React.FC<{ onClose: () => void; onChooseFacility: () => void; onChooseProduct: () => void }> = ({ onClose, onChooseFacility, onChooseProduct }) => (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
 <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 ">
 <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4"><div><h3 className="text-base font-bold text-white">How would you like to request blood?</h3><p className="mt-1 text-xs text-slate-400">Choose the workflow that matches how your team works.</p></div><Button variant="ghost" size="none" type="button" onClick={onClose} aria-label="Close request options" className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"><X className="size-5" /></Button></div>
 <div className="grid gap-4 p-6 sm:grid-cols-2">
 <Button variant="ghost" size="none" type="button" onClick={onChooseFacility} className="rounded-2xl border border-slate-700 bg-slate-950 p-5 text-left transition-colors hover:border-cyan-500 hover:bg-slate-800/40"><div className="flex size-10 items-center justify-center rounded-xl bg-cyan-950 text-cyan-300"><MapPin className="size-5" /></div><h4 className="mt-4 font-bold text-white">Facility first</h4><p className="mt-1 text-xs leading-relaxed text-slate-400">Browse facilities by shortest distance, select one, then request from its complete inventory matrix.</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-cyan-300">Browse nearby facilities <ChevronRight className="size-3.5" /></span></Button>
 <Button variant="ghost" size="none" type="button" onClick={onChooseProduct} className="rounded-2xl border border-slate-700 bg-slate-950 p-5 text-left transition-colors hover:border-primary hover:bg-slate-800/40"><div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary"><Droplet className="size-5 fill-primary" /></div><h4 className="mt-4 font-bold text-white">Product first</h4><p className="mt-1 text-xs leading-relaxed text-slate-400">Choose the blood group, component, and quantity first, then see nearby facilities that can supply it.</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary">Find matching stock <ChevronRight className="size-3.5" /></span></Button>
 </div>
 </div>
 </div>
);

const ProductFirstFacilitySearch: React.FC<{ providers: Provider[]; onBack: () => void; onClose: () => void; onSelect: (provider: Provider, item: RequestItem) => void }> = ({ providers, onBack, onClose, onSelect }) => {
 const [bloodType, setBloodType] = useState<FullBloodType>('O-');
 const [component, setComponent] = useState<BloodComponentType>('Packed Red Blood Cells (PRBC)');
 const [quantity, setQuantity] = useState(1);
 const [query, setQuery] = useState('');
 const [networkScope, setNetworkScope] = useState<'province' | 'region'>('province');
 const [page, setPage] = useState(1);
 const [hasSearched, setHasSearched] = useState(false);
 const matchingProviders = useMemo(() => providers.filter(provider =>
 hasSearched &&
 (networkScope === 'region' || provider.networkScope === 'province') &&
 providerCanReceiveRequest(provider, [{ bloodType, component, quantity }]) &&
 provider.name.toLowerCase().includes(query.toLowerCase())
 ), [bloodType, component, hasSearched, networkScope, providers, quantity, query]);
 const totalPages = Math.max(1, Math.ceil(matchingProviders.length / PROVIDERS_PER_PAGE));
 const visibleProviders = matchingProviders.slice((page - 1) * PROVIDERS_PER_PAGE, page * PROVIDERS_PER_PAGE);

 useEffect(() => setPage(1), [bloodType, component, networkScope, quantity, query]);

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
 <div className="my-4 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 ">
 <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
 <div className="flex items-center gap-2.5">
 <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-white">
 <Droplet className="size-4 fill-white" />
 </div>
 <div>
 <h3 className="text-base font-bold text-white">Find Nearby Matching Stock</h3>
 <p className="text-xs text-slate-400">Choose a product, then select a nearby facility with enough available units.</p>
 </div>
 </div>
 <Button variant="ghost" size="none" type="button" onClick={onClose} aria-label="Close product search" className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
 <X className="size-5" />
 </Button>
 </div>
 <div className="flex-1 overflow-y-auto p-6 text-xs">
 <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:grid-cols-3">
 <label className="flex flex-col gap-1.5 text-slate-400">Blood group
 <Select value={bloodType} onValueChange={value => { setBloodType(value as FullBloodType); setHasSearched(false); }}>
 <SelectTrigger className="w-full">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectGroup>
 {BLOOD_GROUPS.map(group =>
 <SelectItem key={group} value={group}>{group}</SelectItem>)}
 </SelectGroup>
 </SelectContent>
 </Select>
 </label>
 <label className="flex flex-col gap-1.5 text-slate-400">
 Component
 <Select value={component} onValueChange={value => { setComponent(value as BloodComponentType); setHasSearched(false); }}>
 <SelectTrigger className="w-full">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectGroup>
 {COMPONENTS.map(componentOption =>
 <SelectItem key={componentOption.value} value={componentOption.value}>{componentOption.label}</SelectItem>)}
 </SelectGroup>
 </SelectContent>
 </Select>
 </label>
 <label className="flex flex-col gap-1.5 text-slate-400">
 Quantity
 <Input type="number" min={1} max={20} value={quantity} onChange={event => { setQuantity(Math.min(20, Math.max(1, Number(event.target.value) || 1))); setHasSearched(false); }} />
 </label>
 </div>
 <div className="mt-3 flex gap-2">
 <Button type="button" onClick={() => setHasSearched(true)} className="flex-1">
 <Search className="size-4" /> Search facilities
 </Button>
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button type="button" variant="outline" size="icon" aria-label="Network coverage">
 <Settings />
 <span className="sr-only">Network coverage</span>
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end">
 <DropdownMenuLabel>Network coverage</DropdownMenuLabel>
 <DropdownMenuRadioGroup value={networkScope} onValueChange={value => { setNetworkScope(value as 'province' | 'region'); setHasSearched(false); }}>
 <DropdownMenuRadioItem value="province">Province-wide</DropdownMenuRadioItem>
 <DropdownMenuRadioItem value="region">Region-wide</DropdownMenuRadioItem>
 </DropdownMenuRadioGroup>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 <div className="mt-5"><InputGroup><InputGroupInput value={query} onChange={event => { setQuery(event.target.value); setHasSearched(false); }} placeholder="Search matching facility" aria-label="Search matching facilities" /><InputGroupAddon><Search /></InputGroupAddon></InputGroup></div>
 <div className="mt-4 mb-3 flex items-center justify-between text-[10px] text-slate-500"><span>{hasSearched ? `${matchingProviders.length} ${networkScope}-wide facilities found; ${matchingProviders.filter(provider => provider.inventoryReported).length} report matching stock` : 'Search when your product details are ready'}</span><span>Nearest first</span></div>
 <div className="flex flex-col gap-3">
 {visibleProviders.map(provider => {
 const details = ROLE_DETAILS[provider.role];
 const Icon = details.icon;
 const stock = provider.inventoryByProduct[productKey(bloodType, component)] || 0;
 return (
 <Button variant="ghost" size="none" key={provider.id} type="button" onClick={() => onSelect(provider, { bloodType, component, quantity })} className="flex w-full justify-start whitespace-normal rounded-xl border border-slate-700 bg-slate-950 p-4 text-left transition-colors hover:border-cyan-500 hover:bg-slate-800/40">
 <div className="flex w-full items-center justify-between gap-3">
 <div className="flex min-w-0 items-start gap-3">
 <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${details.tone}`}><Icon className="size-4" /></div>
 <div className="min-w-0">
 <div className="flex flex-wrap items-center gap-2"><span className="font-bold text-white">{provider.name}</span><span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${details.tone}`}>{providerTypeLabel(provider)}</span></div>
 <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-slate-400"><span>{providerDistanceLabel(provider)}</span><span>{provider.eta}</span></div>
 </div>
 </div>
 <div className="shrink-0 text-right"><div className="font-mono text-lg font-black text-emerald-400">{provider.inventoryReported ? stock : '—'}</div><div className="text-[10px] text-slate-400">{provider.inventoryReported ? 'matching units' : 'stock not reported'}</div></div>
 </div>
 </Button>
 );
 })}
 {!hasSearched ? <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-slate-500">Select a product and click Search nearby facilities.</div> : visibleProviders.length === 0 && <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-slate-500">No facilities match the current product and network coverage.</div>}
 </div>
 </div>
 {matchingProviders.length > PROVIDERS_PER_PAGE && <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-6 py-3 text-xs"><span className="text-slate-400">Page {page} of {totalPages}</span><div className="flex gap-2"><Button variant="ghost" size="none" type="button" disabled={page === 1} onClick={() => setPage(current => current - 1)} className="rounded-lg bg-slate-800 px-3 py-1.5 text-slate-300 disabled:opacity-40">Previous</Button><Button variant="ghost" size="none" type="button" disabled={page === totalPages} onClick={() => setPage(current => current + 1)} className="rounded-lg bg-slate-800 px-3 py-1.5 text-slate-300 disabled:opacity-40">Next</Button></div></div>}
 </div>
 </div>
 );
};

const ProductFirstBatchSearch: React.FC<{ providers: Provider[]; onBack: () => void; onClose: () => void; onSelect: (provider: Provider, items: RequestItem[]) => void }> = ({ providers, onBack, onClose, onSelect }) => {
 const [bloodType, setBloodType] = useState<FullBloodType>('O-');
 const [component, setComponent] = useState<BloodComponentType>('Packed Red Blood Cells (PRBC)');
 const [quantity, setQuantity] = useState(1);
 const [items, setItems] = useState<RequestItem[]>([]);
 const [query, setQuery] = useState('');
 const [role, setRole] = useState<UserRole | 'all'>('all');
 const [page, setPage] = useState(1);
 const [stage, setStage] = useState<'build' | 'facilities'>('build');

 const matchingProviders = useMemo(() => providers.filter(provider =>
 items.length > 0 &&
 items.every(item => (provider.inventoryByProduct[productKey(item.bloodType, item.component)] || 0) >= item.quantity) &&
 provider.name.toLowerCase().includes(query.toLowerCase()) &&
 (role === 'all' || provider.role === role)
 ), [items, providers, query, role]);
 const totalPages = Math.max(1, Math.ceil(matchingProviders.length / PROVIDERS_PER_PAGE));
 const visibleProviders = matchingProviders.slice((page - 1) * PROVIDERS_PER_PAGE, page * PROVIDERS_PER_PAGE);

 useEffect(() => setPage(1), [items, query, role]);

 const addToBatch = () => {
 setItems(current => {
 const existingIndex = current.findIndex(item => item.bloodType === bloodType && item.component === component);
 if (existingIndex < 0) return [...current, { bloodType, component, quantity }];
 return current.map((item, index) => index === existingIndex ? { ...item, quantity: item.quantity + quantity } : item);
 });
 setQuantity(1);
 setStage('build');
 };

 if (stage === 'build') {
 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
 <div className="my-4 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 ">
 <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4"><div className="flex items-center gap-2.5"><Button variant="ghost" size="none" type="button" onClick={onBack} aria-label="Back to request options" className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"><ArrowLeft className="size-4" /></Button><div className="flex size-9 items-center justify-center rounded-lg bg-primary text-white"><ShoppingCart className="size-4" /></div><div><h3 className="text-base font-bold text-white">Step 1: Build Your Request Queue</h3><p className="text-xs text-slate-400">Add every blood product and quantity before looking for a facility.</p></div></div><Button variant="ghost" size="none" type="button" onClick={onClose} aria-label="Close product-first request" className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"><X className="size-5" /></Button></div>
 <div className="flex-1 overflow-y-auto p-6 text-xs"><div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:grid-cols-3"><label className="flex flex-col gap-1.5 text-slate-400">Blood group<Select value={bloodType} onChange={event => setBloodType(event.target.value as FullBloodType)} className="rounded-lg border border-slate-700 bg-slate-900 p-2.5 font-mono font-bold text-white outline-none focus:border-primary">{BLOOD_GROUPS.map(group => <option key={group} value={group}>{group}</option>)}</Select></label><label className="flex flex-col gap-1.5 text-slate-400">Component<Select value={component} onChange={event => setComponent(event.target.value as BloodComponentType)} className="rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white outline-none focus:border-primary">{COMPONENTS.map(componentOption => <option key={componentOption.value} value={componentOption.value}>{componentOption.value}</option>)}</Select></label><label className="flex flex-col gap-1.5 text-slate-400">Quantity<Input type="number" min={1} max={20} value={quantity} onChange={event => setQuantity(Math.min(20, Math.max(1, Number(event.target.value) || 1)))} className="rounded-lg border border-slate-700 bg-slate-900 p-2.5 font-mono font-bold text-white outline-none focus:border-primary" /></label></div><Button variant="ghost" size="none" type="button" onClick={addToBatch} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary"><Plus className="size-4" /> Add to request queue</Button><div className="mt-5"><div className="mb-2 flex items-center justify-between"><h4 className="font-bold uppercase tracking-wider text-slate-300">Request Queue</h4><span className="font-mono text-[10px] text-slate-400">{items.length} items · {items.reduce((total, item) => total + item.quantity, 0)} units</span></div><div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950"><table className="w-full text-left"><thead className="bg-slate-900 font-mono text-[9px] uppercase text-slate-400"><tr><th className="px-3 py-2">Product</th><th className="px-3 py-2 text-center">Qty</th><th className="px-3 py-2 text-right"></th></tr></thead><tbody className="divide-y divide-slate-800">{items.map((item, index) => <tr key={`${item.bloodType}-${item.component}`}><td className="px-3 py-3"><span className="font-mono font-bold text-primary">{item.bloodType}</span><span className="mx-1.5 text-slate-600">·</span><span className="text-slate-300">{item.component.split('(')[0]}</span></td><td className="px-3 py-3 text-center font-mono font-bold text-white">{item.quantity}</td><td className="px-3 py-3 text-right"><Button variant="ghost" size="none" type="button" onClick={() => setItems(current => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-primary" aria-label="Remove item from request queue"><Trash2 className="size-3.5" /></Button></td></tr>)}{items.length === 0 && <tr><td colSpan={3} className="px-3 py-8 text-center text-slate-500">Add a blood product to begin.</td></tr>}</tbody></table></div></div></div>
 <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-6 py-4"><span className="text-xs text-slate-400">Next, we’ll find facilities that can fulfill the full queue.</span><Button variant="ghost" size="none" type="button" onClick={() => setStage('facilities')} disabled={items.length === 0} className="flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-40">Find matching facilities <ChevronRight className="size-4" /></Button></div>
 </div>
 </div>
 );
 }

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
 <div className="my-4 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 ">
 <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
 <div className="flex items-center gap-2.5"><Button variant="ghost" size="none" type="button" onClick={onBack} aria-label="Back to request options" className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"><ArrowLeft className="size-4" /></Button><div className="flex size-9 items-center justify-center rounded-lg bg-primary text-white"><Droplet className="size-4 fill-white" /></div><div><h3 className="text-base font-bold text-white">Step 2: Choose a Matching Facility</h3><p className="text-xs text-slate-400">Your queue is ready. Select the nearest facility that can fulfill the entire batch.</p></div></div>
 <Button variant="ghost" size="none" type="button" onClick={onClose} aria-label="Close product search" className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"><X className="size-5" /></Button>
 </div>

 <div className="flex-1 overflow-y-auto p-6 text-xs">
 <div className="grid gap-5 lg:grid-cols-5">
 <div className="lg:col-span-2">
 <section className="rounded-xl border border-slate-800 bg-slate-950 p-4">
 <h4 className="mb-3 flex items-center gap-2 font-bold text-slate-200"><Droplet className="size-4 fill-primary text-primary" /> Add product to batch</h4>
 <div className="flex flex-col gap-3">
 <label className="flex flex-col gap-1.5 text-slate-400">Blood group<Select value={bloodType} onChange={event => setBloodType(event.target.value as FullBloodType)} className="rounded-lg border border-slate-700 bg-slate-900 p-2.5 font-mono font-bold text-white outline-none focus:border-primary">{BLOOD_GROUPS.map(group => <option key={group} value={group}>{group}</option>)}</Select></label>
 <label className="flex flex-col gap-1.5 text-slate-400">Component<Select value={component} onChange={event => setComponent(event.target.value as BloodComponentType)} className="rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white outline-none focus:border-primary">{COMPONENTS.map(componentOption => <option key={componentOption.value} value={componentOption.value}>{componentOption.value}</option>)}</Select></label>
 <label className="flex flex-col gap-1.5 text-slate-400">Required quantity<Input type="number" min={1} max={20} value={quantity} onChange={event => setQuantity(Math.min(20, Math.max(1, Number(event.target.value) || 1)))} className="rounded-lg border border-slate-700 bg-slate-900 p-2.5 font-mono font-bold text-white outline-none focus:border-primary" /></label>
 <Button variant="ghost" size="none" type="button" onClick={addToBatch} className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2.5 font-bold text-slate-200 transition-colors hover:bg-slate-700"><Plus className="size-3.5" /> Add to batch</Button>
 </div>
 </section>
 <section className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
 <div className="mb-3 flex items-center justify-between"><h4 className="font-bold text-slate-200">Batch Queue</h4><span className="font-mono text-[10px] text-slate-400">{items.length} items · {items.reduce((total, item) => total + item.quantity, 0)} units</span></div>
 <div className="flex flex-col gap-2">{items.map((item, index) => <div key={`${item.bloodType}-${item.component}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900 p-2"><span className="min-w-0 text-[11px] text-slate-300"><strong className="font-mono text-primary">{item.bloodType}</strong><span className="mx-1.5 text-slate-600">·</span>{item.quantity} × {item.component.split('(')[0]}</span><Button variant="ghost" size="none" type="button" onClick={() => setItems(current => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-primary" aria-label="Remove batch item"><Trash2 className="size-3.5" /></Button></div>)}{items.length === 0 && <p className="rounded-lg border border-dashed border-slate-700 px-3 py-5 text-center text-[11px] text-slate-500">Add one or more products to find eligible facilities.</p>}</div>
 </section>
 </div>

 <section className="rounded-xl border border-slate-800 bg-slate-950 p-4 lg:col-span-3">
 <div className="mb-1 flex items-center gap-2"><MapPin className="size-4 text-cyan-400" /><h4 className="font-bold text-slate-200">Facilities that can fulfill this batch</h4></div>
 <p className="mb-4 text-[11px] text-slate-500">Only facilities with enough stock for every queued item appear here. Results remain nearest first.</p>
 <div className="mb-4 flex flex-col gap-2 sm:flex-row"><InputGroup className="h-10 flex-1"><InputGroupInput value={query} onChange={event => setQuery(event.target.value)} placeholder="Search matching facility" aria-label="Search matching facilities" className="text-xs" /><InputGroupAddon><Search /></InputGroupAddon></InputGroup><Select value={role} onChange={event => setRole(event.target.value as UserRole | 'all')} aria-label="Filter matching facilities by type" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-500"><option value="all">All facility types</option><option value="blood_center">Blood centers</option><option value="blood_bank">Blood banks</option><option value="blood_service_facility">Service facilities</option></Select></div>
 <div className="mb-3 flex justify-between text-[10px] text-slate-500"><span>{matchingProviders.length} facilities can fulfill {items.length} batch item{items.length === 1 ? '' : 's'}</span><span>Nearest first</span></div>
 <div className="flex flex-col gap-3">{visibleProviders.map(provider => { const details = ROLE_DETAILS[provider.role]; const Icon = details.icon; return <Button variant="ghost" size="none" key={provider.id} type="button" onClick={() => onSelect(provider, items)} className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-left transition-colors hover:border-cyan-500 hover:bg-slate-800/60"><div className="flex items-center justify-between gap-3"><div className="flex items-start gap-3"><div className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${details.tone}`}><Icon className="size-4" /></div><div><div className="flex flex-wrap items-center gap-2"><span className="font-bold text-white">{provider.name}</span><span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${details.tone}`}>{details.label}</span></div><div className="mt-1 flex gap-3 font-mono text-[11px] text-slate-400"><span>{provider.distanceKm} km away</span><span>{provider.eta}</span></div></div></div><ChevronRight className="size-4 text-slate-500" /></div></Button>; })}{items.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-slate-500">Add products to the batch to see matching facilities.</div> : visibleProviders.length === 0 && <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-slate-500">No nearby facility can fulfill the complete batch.</div>}</div>
 {matchingProviders.length > PROVIDERS_PER_PAGE && <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3"><span className="text-[10px] text-slate-400">Page {page} of {totalPages}</span><div className="flex gap-2"><Button variant="ghost" size="none" type="button" disabled={page === 1} onClick={() => setPage(current => current - 1)} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40">Previous</Button><Button variant="ghost" size="none" type="button" disabled={page === totalPages} onClick={() => setPage(current => current + 1)} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40">Next</Button></div></div>}
 </section>
 </div>
 </div>
 </div>
 </div>
 );
};

const ProductFirstConfirmationModal: React.FC<{ provider: Provider; items: RequestItem[]; onBack: () => void; onComplete: () => void }> = ({ provider, items, onBack, onComplete }) => {
 const { user } = useAuth();
 const { addRequisition } = useBloodData();
 const canFulfill = items.length > 0 && providerCanReceiveRequest(provider, items);
 const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);

 const submitRequest = () => {
 if (!canFulfill) return;
 const firstItem = items[0];
 if (addRequisition({
 requestingFacilityId: user?.facilityCode || 'BSF-SUNRISE-12',
 requestingFacilityName: user?.facilityName || 'ESTEVEZ MEMORIAL HOSPITAL INC.',
 requestingFacilityType: 'blood_service_facility',
 targetFacilityId: provider.id,
 targetFacilityName: provider.name,
 targetFacilityType: provider.role,
 requiredComponent: firstItem.component,
 requiredBloodType: firstItem.bloodType,
 quantityRequested: totalQuantity,
 allocatedUnitIds: [],
 items: items.map((item, index) => ({
 id: `REQ-ITEM-${Date.now()}-${index}`,
 requiredBloodType: item.bloodType,
 requiredComponent: item.component,
 quantityRequested: item.quantity,
 allocatedUnitIds: [],
 })),
 requestorName: user?.name || 'Clinical Staff',
 notes: provider.inventoryReported
 ? `Product-first nearby-facility request: ${providerDistanceLabel(provider)}; expected dispatch ${provider.eta}.`
 : `Product-first request sent to a public facility-directory record. The facility does not report inventory in the network; availability requires approval.${provider.directorySource ? ` Source: ${provider.directorySource}.` : ''}`,
 })) onComplete();
 };

 return (
 <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
 <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 ">
 <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4"><div className="flex items-center gap-2.5"><Button variant="ghost" size="none" type="button" onClick={onBack} aria-label="Back to matching facilities" className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"><ArrowLeft className="size-4" /></Button><div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-white"><CheckCircle2 className="size-4" /></div><div><h3 className="text-base font-bold text-white">Confirm Product-First Request</h3><p className="text-xs text-slate-400">Review the complete batch against the selected facility’s available stock.</p></div></div><Button variant="ghost" size="none" type="button" onClick={onBack} aria-label="Close request confirmation" className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"><X className="size-5" /></Button></div>
 <div className="p-6 text-xs"><div className="rounded-xl border border-cyan-900/60 bg-cyan-950/30 p-4"><div className="font-bold text-cyan-200">{provider.name}</div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-cyan-300"><span>{providerDistanceLabel(provider)}</span><span>{provider.eta}</span><span>{provider.inventoryReported ? `${provider.totalAvailableUnits} total available units` : 'Inventory not reported'}</span></div></div>
 <div className="mt-5 overflow-hidden rounded-xl border border-slate-800"><table className="w-full text-left"><thead className="bg-slate-950 font-mono text-[9px] uppercase text-slate-400"><tr><th className="px-3 py-2">Product</th><th className="px-3 py-2 text-center">Requested</th><th className="px-3 py-2 text-center">Available</th><th className="px-3 py-2 text-right">Result</th></tr></thead><tbody className="divide-y divide-slate-800">{items.map(item => { const stock = provider.inventoryByProduct[productKey(item.bloodType, item.component)] || 0; const sufficient = !provider.inventoryReported || stock >= item.quantity; return <tr key={`${item.bloodType}-${item.component}`}><td className="px-3 py-3"><span className="font-mono font-bold text-primary">{item.bloodType}</span><span className="mx-1.5 text-slate-600">·</span><span className="text-slate-300">{item.component.split('(')[0]}</span></td><td className="px-3 py-3 text-center font-mono font-bold text-white">{item.quantity}</td><td className="px-3 py-3 text-center font-mono font-bold text-slate-200">{provider.inventoryReported ? stock : 'Not reported'}</td><td className="px-3 py-3 text-right"><span className={sufficient ? 'font-semibold text-emerald-400' : 'font-semibold text-primary'}>{provider.inventoryReported ? (sufficient ? 'Available' : 'Insufficient') : 'Awaiting approval'}</span></td></tr>; })}</tbody></table></div>
 <p className="mt-4 text-[11px] text-slate-400">{provider.inventoryReported ? 'This confirmation is read-only. Use Back to adjust the request or choose another facility.' : 'This directory facility does not publish blood stock. Your request will remain pending until the facility confirms availability.'}</p>
 </div>
 <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-6 py-4"><span className="text-xs text-slate-400">{items.length} products · {totalQuantity} units</span><Button variant="ghost" size="none" type="button" onClick={submitRequest} disabled={!canFulfill} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-bold text-white transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-40"><Send className="size-4" /> Submit request</Button></div>
 </div>
 </div>
 );
};

const FacilityStockRequestModal: React.FC<{ provider: Provider; initialItems: RequestItem[]; onBack: () => void; onComplete: () => void }> = ({ provider, initialItems, onBack, onComplete }) => {
 const { user } = useAuth();
 const { addRequisition } = useBloodData();
 const [items, setItems] = useState<RequestItem[]>(initialItems);
 const [selectedProduct, setSelectedProduct] = useState<{ bloodType: FullBloodType; component: BloodComponentType } | null>(null);
 const [quantity, setQuantity] = useState(1);

 const selectedStock = selectedProduct ? provider.inventoryByProduct[productKey(selectedProduct.bloodType, selectedProduct.component)] || 0 : 0;
 const queuedQuantity = selectedProduct ? items.find(item => item.bloodType === selectedProduct.bloodType && item.component === selectedProduct.component)?.quantity || 0 : 0;
 const requestableCount = Math.max(selectedStock - queuedQuantity, 0);

 useEffect(() => {
 if (selectedProduct) setQuantity(requestableCount > 0 ? 1 : 0);
 }, [selectedProduct, requestableCount]);

 const selectProduct = (bloodType: FullBloodType, component: BloodComponentType) => {
 const stock = provider.inventoryByProduct[productKey(bloodType, component)] || 0;
 const queued = items.find(item => item.bloodType === bloodType && item.component === component)?.quantity || 0;
 if (stock > queued) setSelectedProduct({ bloodType, component });
 };

 const addItem = () => {
 if (!selectedProduct || quantity < 1 || quantity > requestableCount) return;
 setItems(current => {
 const index = current.findIndex(item => item.bloodType === selectedProduct.bloodType && item.component === selectedProduct.component);
 if (index < 0) return [...current, { ...selectedProduct, quantity }];
 return current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: item.quantity + quantity } : item);
 });
 setSelectedProduct(null);
 };

 const submitRequest = () => {
 if (items.length === 0 || !providerCanReceiveRequest(provider, items)) return;
 const firstItem = items[0];
 const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
 const requisitionItems: RequisitionItem[] = items.map((item, index) => ({ id: `REQ-ITEM-${Date.now()}-${index}`, requiredBloodType: item.bloodType, requiredComponent: item.component, quantityRequested: item.quantity, allocatedUnitIds: [] }));
 if (addRequisition({
 requestingFacilityId: user?.facilityCode || 'BSF-SUNRISE-12',
 requestingFacilityName: user?.facilityName || 'ESTEVEZ MEMORIAL HOSPITAL INC.',
 requestingFacilityType: 'blood_service_facility',
 targetFacilityId: provider.id,
 targetFacilityName: provider.name,
 targetFacilityType: provider.role,
 requiredComponent: firstItem.component,
 requiredBloodType: firstItem.bloodType,
 quantityRequested: totalQuantity,
 allocatedUnitIds: [],
 items: requisitionItems,
 requestorName: user?.name || 'Clinical Staff',
 notes: `Nearby-facility request: ${providerDistanceLabel(provider)}; coordinates ${providerCoordinatesLabel(provider)}; expected dispatch ${provider.eta}.`,
 })) onComplete();
 };

 const cellClass = (bloodType: FullBloodType, component: BloodComponentType, stock: number, queued: number) => {
 if (queued >= stock && stock > 0) return 'border-cyan-500 bg-cyan-950/50 text-cyan-200 ring-1 ring-cyan-500';
 if (stock > 0 && providerBloodComponentStockLevel(provider, bloodType, component) === 'critical') return 'border-primary/50 bg-primary/40 text-primary';
 if (stock > 10) return 'border-emerald-900/50 bg-emerald-950/40 text-emerald-300';
 if (stock > 0) return 'border-amber-900/50 bg-amber-950/40 text-amber-300';
 return 'border-slate-800 bg-slate-800/40 text-slate-600';
 };

 return (
 <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
 <div className="my-4 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 ">
 <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
 <div className="flex items-center gap-2.5"><Button variant="ghost" size="none" type="button" onClick={onBack} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white" aria-label="Back to nearby facilities"><ArrowLeft className="size-4" /></Button><div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white"><ShoppingCart className="size-4" /></div><div><h3 className="text-base font-bold text-white">Request From {provider.name}</h3><p className="text-xs text-slate-400">Select available products, set their quantities, then build the batch request.</p></div></div>
 <Button variant="ghost" size="none" type="button" onClick={onBack} aria-label="Close facility inventory" className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"><X className="size-5" /></Button>
 </div>

 <div className="flex-1 overflow-y-auto p-6 text-xs">
 {initialItems.length > 0 && <div className="mb-4 flex items-center gap-2 rounded-xl border border-cyan-900/60 bg-cyan-950/30 px-3 py-2.5 text-xs text-cyan-200"><Plus className="size-4 shrink-0" /><span>Product-first selection added to your batch: <strong>{initialItems.map(item => `${item.quantity} × ${item.bloodType} ${item.component.split('(')[0]}`).join(', ')}</strong>. You do not need to set this quantity again.</span></div>}
 <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
 <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><Droplet className="size-4 fill-primary text-primary" /><h4 className="font-bold text-slate-200">Available Stock Matrix</h4></div><span className="font-mono text-[10px] text-slate-400">{provider.totalAvailableUnits} available units · {providerDistanceLabel(provider)} · {providerCoordinatesLabel(provider)}</span></div>
 <p className="mt-1 text-[10px] text-slate-500">Select an in-stock cell to set the quantity. The cell shows available stock and is highlighted when it is in your batch queue.</p>
 <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[500px] border-separate border-spacing-1 text-center"><thead className="font-mono text-[9px] uppercase text-slate-500"><tr><th className="px-1 py-1 text-left">Group</th>{COMPONENTS.map(component => <th key={component.value} className="px-1 py-1">{component.label}</th>)}</tr></thead><tbody>{BLOOD_GROUPS.map(group => <tr key={group}><td className="px-1 py-1 text-left font-mono font-bold text-primary">{group}</td>{COMPONENTS.map(component => { const stock = provider.inventoryByProduct[productKey(group, component.value)] || 0; const queued = items.find(item => item.bloodType === group && item.component === component.value)?.quantity || 0; const critical = providerBloodComponentStockLevel(provider, group, component.value) === 'critical'; const fullyQueued = queued >= stock; return <td key={component.value} className="p-0.5"><Button variant="ghost" size="none" type="button" disabled={critical || stock === 0 || fullyQueued} onClick={() => selectProduct(group, component.value)} title={critical ? `${group} ${component.label} is at a critical level and cannot be requested.` : `${group} ${component.label}: ${stock} available`} className={`w-full rounded-lg border px-1 py-2 font-mono text-xs font-bold transition-all ${stock > 0 && !fullyQueued && !critical ? 'cursor-pointer hover:scale-105 hover:brightness-125' : 'cursor-not-allowed opacity-60'} ${cellClass(group, component.value, stock, queued)}`}>{stock}</Button></td>; })}</tr>)}</tbody></table></div>
 <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-800 pt-2 text-[10px] text-slate-400"><span className="text-emerald-300">Green = 11+ units</span><span className="text-amber-300">Amber = 1–10 units</span><span className="text-cyan-300">Cyan = fully queued</span></div>
 </div>

 <div className="mt-5"><div className="mb-2 flex items-center justify-between"><h4 className="font-bold uppercase tracking-wider text-slate-300">Batch Queue</h4><span className="font-mono text-[10px] text-slate-400">{items.length} items · {items.reduce((total, item) => total + item.quantity, 0)} units</span></div><div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950"><table className="w-full text-left"><thead className="bg-slate-900 font-mono text-[9px] uppercase text-slate-400"><tr><th className="px-3 py-2">Blood group</th><th className="px-3 py-2">Component</th><th className="px-3 py-2 text-center">Qty</th><th className="px-3 py-2 text-right"></th></tr></thead><tbody className="divide-y divide-slate-800">{items.map((item, index) => <tr key={`${item.bloodType}-${item.component}`}><td className="px-3 py-2.5 font-mono font-bold text-primary">{item.bloodType}</td><td className="px-3 py-2.5 text-slate-300">{item.component.split('(')[0]}</td><td className="px-3 py-2.5 text-center font-mono font-bold text-white">{item.quantity}</td><td className="px-3 py-2.5 text-right"><Button variant="ghost" size="none" type="button" onClick={() => setItems(current => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-primary" aria-label="Remove item from batch"><Trash2 className="size-3.5" /></Button></td></tr>)}{items.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">Select a product from the facility inventory above to start the batch.</td></tr>}</tbody></table></div></div>
 </div>

 <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-6 py-4"><span className="text-xs text-slate-400">One request will be sent to {provider.name}.</span><Button variant="ghost" size="none" type="button" onClick={submitRequest} disabled={items.length === 0 || !providerCanReceiveRequest(provider, items)} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-bold text-white transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-40"><Send className="size-4" /> Submit request ({items.reduce((total, item) => total + item.quantity, 0)} units)</Button></div>
 </div>

 {selectedProduct && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 "><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-primary text-white"><Plus className="size-5" /></div><div><h4 className="text-base font-bold text-white">Add {selectedProduct.bloodType} {COMPONENTS.find(component => component.value === selectedProduct.component)?.label}</h4><p className="mt-1 text-xs text-slate-400">Set how many units to add to this batch.</p></div></div><Button variant="ghost" size="none" type="button" onClick={() => setSelectedProduct(null)} className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white" aria-label="Close quantity dialog"><X className="size-5" /></Button></div><div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs"><div className="flex justify-between text-slate-400"><span>Available at selected facility</span><span className="font-mono font-bold text-white">{selectedStock} units</span></div>{queuedQuantity > 0 && <div className="mt-2 flex justify-between text-slate-400"><span>Already in batch queue</span><span className="font-mono font-bold text-cyan-300">{queuedQuantity} units</span></div>}<div className="mt-2 flex justify-between border-t border-slate-800 pt-2"><span className="font-semibold text-slate-300">Available to add</span><span className="font-mono font-bold text-emerald-400">{requestableCount} units</span></div></div><label className="mt-5 flex flex-col gap-2 text-xs font-semibold text-slate-300">Quantity<Input type="number" min={1} max={requestableCount} value={quantity} onChange={event => setQuantity(Math.min(requestableCount, Math.max(1, Number(event.target.value) || 1)))} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm font-bold text-white outline-none focus:border-primary" autoFocus /></label><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" size="none" type="button" onClick={() => setSelectedProduct(null)} className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700">Cancel</Button><Button variant="ghost" size="none" type="button" onClick={addItem} disabled={requestableCount === 0 || quantity === 0} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary disabled:opacity-40"><Plus className="size-4" /> Add to batch queue</Button></div></div></div>}
 </div>
 );
};
