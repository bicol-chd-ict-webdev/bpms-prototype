import { RHLN_FACILITIES as ZONE_B_FACILITIES } from './rhln-facilities/zone-b';
import { RHLN_FACILITY_DATA_SOURCE, type RhlnFacility } from './rhlnFacilityTypes';

export { getRhlnFacilityRole, normalizeRhlnFacilityName, RHLN_FACILITY_DATA_SOURCE, RHLN_FACILITY_DATA_SOURCE_URL, type RhlnFacility, type RhlnFacilityCategory } from './rhlnFacilityTypes';

export const RHLN_FACILITIES: RhlnFacility[] = [
  ...ZONE_B_FACILITIES,
];
