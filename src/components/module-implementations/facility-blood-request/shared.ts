import React from 'react';
import { Building2, HeartPulse, Landmark } from 'lucide-react';
import { BloodComponentType, FullBloodType, UserRole } from '../../../types/blood';
import { getBloodTypeStockLevel, isRedCellComponent } from '../../../lib/bloodStockLevel';

export type Provider = {
 id: string;
 name: string;
 role: UserRole;
 distanceKm: number | null;
 eta: string;
 totalAvailableUnits: number;
 inventoryByProduct: Record<string, number>;
 networkScope: 'province' | 'region';
 province: string;
 latitude: number | null;
 longitude: number | null;
 inventoryReported: boolean;
};

export type RequestItem = {
 bloodType: FullBloodType;
 component: BloodComponentType;
 quantity: number;
};

export type RequestPath = 'choose' | 'facility' | 'product';

export const ROLE_DETAILS: Record<UserRole, { label: string; icon: React.ElementType; tone: string }> = {
 blood_center: { label: 'Blood Center', icon: Landmark, tone: 'text-primary bg-primary/10 border-primary/30' },
 blood_bank: { label: 'Blood Bank', icon: Building2, tone: 'text-cyan-300 bg-cyan-950/40 border-cyan-800/60' },
 blood_service_facility: { label: 'Blood Service Facility', icon: HeartPulse, tone: 'text-emerald-300 bg-emerald-950/40 border-emerald-800/60' },
};

export const BLOOD_GROUPS: FullBloodType[] = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
export const COMPONENTS: { label: string; value: BloodComponentType }[] = [
 { label: 'PRBC', value: 'Packed Red Blood Cells (PRBC)' },
 { label: 'FFP', value: 'Fresh Frozen Plasma (FFP)' },
 { label: 'PLT', value: 'Platelet Concentrate' },
 { label: 'CRYO', value: 'Cryoprecipitate' },
 { label: 'WB', value: 'Whole Blood' },
];
export const PROVIDERS_PER_PAGE = 8;
export const productKey = (bloodType: FullBloodType, component: BloodComponentType) => `${bloodType}:${component}`;
export const normalizeFacilityName = (name: string) => name.toUpperCase().replace(/[^A-Z0-9]/g, '');

export const calculateDistanceKm = (originLatitude: number, originLongitude: number, destinationLatitude: number, destinationLongitude: number) => {
 const toRadians = (value: number) => value * Math.PI / 180;
 const latitudeDifference = toRadians(destinationLatitude - originLatitude);
 const longitudeDifference = toRadians(destinationLongitude - originLongitude);
 const distanceFactor = Math.sin(latitudeDifference / 2) ** 2
 + Math.cos(toRadians(originLatitude)) * Math.cos(toRadians(destinationLatitude)) * Math.sin(longitudeDifference / 2) ** 2;
 return Math.round(6_371 * 2 * Math.atan2(Math.sqrt(distanceFactor), Math.sqrt(1 - distanceFactor)) * 10) / 10;
};

export const estimatedTravelTime = (distanceKm: number | null) => distanceKm === null
 ? 'Availability not reported'
 : `~${Math.max(5, Math.round(distanceKm / 30 * 60))} min`;
export const providerDistanceLabel = (provider: Provider) => provider.distanceKm === null ? 'Distance not reported' : `${provider.distanceKm} km away`;
export const providerCoordinatesLabel = (provider: Provider) => (
 provider.latitude === null || provider.latitude === undefined || provider.longitude === null || provider.longitude === undefined
 ? 'Coordinates not reported'
 : `${provider.latitude.toFixed(5)}, ${provider.longitude.toFixed(5)}`
);
export const providerLocationLabel = (provider: Provider) => [provider.province, providerCoordinatesLabel(provider)].filter(Boolean).join(' · ');
export const providerTypeLabel = (provider: Provider) => provider.inventoryReported ? ROLE_DETAILS[provider.role].label : 'Directory facility';
export const providerBloodComponentStockLevel = (provider: Provider, bloodType: FullBloodType, component: BloodComponentType) => (
 isRedCellComponent(component)
 ? getBloodTypeStockLevel(bloodType, provider.inventoryByProduct[productKey(bloodType, component)] || 0)
 : null
);
export const providerCanReceiveRequest = (provider: Provider, items: RequestItem[]) => !provider.inventoryReported || items.every(item => {
 const availableUnits = provider.inventoryByProduct[productKey(item.bloodType, item.component)] || 0;
 return availableUnits >= item.quantity;
});
