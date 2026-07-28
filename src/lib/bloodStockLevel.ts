import type { BloodComponentType, BloodUnit, FullBloodType } from '../types/blood';

export type BloodStockLevel = 'critical' | 'low' | 'stable';

const RED_CELL_COMPONENTS: BloodComponentType[] = [
  'Whole Blood',
  'Packed Red Blood Cells (PRBC)',
];

const getComponentThresholdDivisor = (component: BloodComponentType) => {
  if (RED_CELL_COMPONENTS.includes(component)) return 2;
  if (component === 'Fresh Frozen Plasma (FFP)') return 3;
  return 4;
};

export const getBloodTypeStockLevel = (bloodType: FullBloodType, availableRedCellUnits: number): BloodStockLevel => {
  const isAB = bloodType.startsWith('AB');
  const criticalThreshold = isAB ? 15 : 50;
  const stableThreshold = isAB ? 25 : 51;

  if (availableRedCellUnits < criticalThreshold) return 'critical';
  if (availableRedCellUnits < stableThreshold) return 'low';
  return 'stable';
};

export const getAvailableRedCellUnits = (
  bloodUnits: BloodUnit[],
  bloodType: FullBloodType,
  facilityId: string,
) => bloodUnits.filter(unit =>
  unit.currentLocation.facilityId === facilityId
  && unit.bloodType === bloodType
  && RED_CELL_COMPONENTS.includes(unit.component)
  && unit.status === 'Available'
  && unit.testingStatus.overall === 'Passed'
).length;

export const getAvailableComponentUnits = (
  bloodUnits: BloodUnit[],
  bloodType: FullBloodType,
  component: BloodComponentType,
  facilityId: string,
) => bloodUnits.filter(unit =>
  unit.currentLocation.facilityId === facilityId
  && unit.bloodType === bloodType
  && unit.component === component
  && unit.status === 'Available'
  && unit.testingStatus.overall === 'Passed'
).length;

export const getBloodComponentStockLevel = (
  bloodType: FullBloodType,
  component: BloodComponentType,
  availableUnits: number,
): BloodStockLevel => {
  const divisor = getComponentThresholdDivisor(component);
  const isAB = bloodType.startsWith('AB');
  const criticalThreshold = Math.ceil((isAB ? 15 : 50) / divisor);
  const stableThreshold = Math.ceil((isAB ? 25 : 51) / divisor);

  if (availableUnits < criticalThreshold) return 'critical';
  if (availableUnits < stableThreshold) return 'low';
  return 'stable';
};

export const getFacilityBloodTypeStockLevel = (
  bloodUnits: BloodUnit[],
  bloodType: FullBloodType,
  facilityId: string,
) => getBloodTypeStockLevel(bloodType, getAvailableRedCellUnits(bloodUnits, bloodType, facilityId));

export const getFacilityBloodComponentStockLevel = (
  bloodUnits: BloodUnit[],
  bloodType: FullBloodType,
  component: BloodComponentType,
  facilityId: string,
) => getBloodComponentStockLevel(
  bloodType,
  component,
  getAvailableComponentUnits(bloodUnits, bloodType, component, facilityId),
);
