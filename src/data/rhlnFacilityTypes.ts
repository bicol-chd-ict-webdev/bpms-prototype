export interface RhlnFacility {
  id: string;
  province: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

export const RHLN_FACILITY_DATA_SOURCE = '2026 RHLN Members Location Coordinates';
