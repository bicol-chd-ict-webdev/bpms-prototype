import type { UserRole } from '../types/blood';

export type RhlnFacilityCategory =
  | 'Blood Center'
  | 'Hospital Blood Bank with Additional Functions'
  | 'Hospital-based Blood Station'
  | 'Blood Station';

export interface RhlnFacility {
  id: string;
  province: string;
  name: string;
  category?: RhlnFacilityCategory;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

export const RHLN_FACILITY_DATA_SOURCE = '2026 BLOOD SERVICE FACILITIES (ZONE B)';
export const RHLN_FACILITY_DATA_SOURCE_URL = 'https://docs.google.com/spreadsheets/d/1ghJXjypaeQ1-9BUF0k6ICbN6lhNYAeD4/edit?gid=1877752880#gid=1877752880';

export const getRhlnFacilityRole = (category?: RhlnFacilityCategory): UserRole => {
  if (category === 'Blood Center') return 'blood_center';
  if (category === 'Hospital Blood Bank with Additional Functions') return 'blood_bank';
  return 'blood_service_facility';
};

export const normalizeRhlnFacilityName = (name: string) => name
  .toUpperCase()
  .replace(/\b(?:INCORPORATED|INC|CORPORATION|CORP)\b/g, '')
  .replace(/[^A-Z0-9]/g, '');
