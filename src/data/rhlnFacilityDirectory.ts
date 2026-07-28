import { RHLN_FACILITIES as ALBAY_FACILITIES } from './rhln-facilities/albay';
import { RHLN_FACILITIES as CAMARINES_NORTE_FACILITIES } from './rhln-facilities/camarines-norte';
import { RHLN_FACILITIES as CAMARINES_SUR_FACILITIES } from './rhln-facilities/camarines-sur';
import { RHLN_FACILITIES as CATANDUANES_FACILITIES } from './rhln-facilities/catanduanes';
import { RHLN_FACILITIES as MASBATE_FACILITIES } from './rhln-facilities/masbate';
import { RHLN_FACILITIES as NAGA_CITY_FACILITIES } from './rhln-facilities/naga-city';
import { RHLN_FACILITIES as SORSOGON_FACILITIES } from './rhln-facilities/sorsogon';
import { RHLN_FACILITY_DATA_SOURCE, type RhlnFacility } from './rhlnFacilityTypes';

export { RHLN_FACILITY_DATA_SOURCE, type RhlnFacility } from './rhlnFacilityTypes';

export const RHLN_FACILITIES: RhlnFacility[] = [
  ...ALBAY_FACILITIES,
  ...CAMARINES_NORTE_FACILITIES,
  ...CAMARINES_SUR_FACILITIES,
  ...CATANDUANES_FACILITIES,
  ...MASBATE_FACILITIES,
  ...NAGA_CITY_FACILITIES,
  ...SORSOGON_FACILITIES,
];
