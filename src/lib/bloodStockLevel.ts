import type { BloodComponentType, BloodUnit, FullBloodType } from '../types/blood';

export type BloodStockLevel = 'critical' | 'low' | 'stable' | 'unclassified';

export const RED_CELL_COMPONENTS: BloodComponentType[] = [
  'Whole Blood',
  'Packed Red Blood Cells (PRBC)',
];

export const isRedCellComponent = (component: BloodComponentType) => RED_CELL_COMPONENTS.includes(component);

export const getBloodTypeStockThresholds = (bloodType: FullBloodType) => {
  const isAB = bloodType.startsWith('AB');

  return {
    criticalBelow: isAB ? 15 : 50,
    lowFrom: isAB ? 20 : 50,
    lowTo: isAB ? 24 : 50,
    stableAt: isAB ? 25 : 51,
  };
};

export const getBloodTypeStockLevel = (bloodType: FullBloodType, availableUnits: number): BloodStockLevel => {
  const { criticalBelow, lowFrom, lowTo, stableAt } = getBloodTypeStockThresholds(bloodType);

  if (availableUnits < criticalBelow) return 'critical';
  if (availableUnits >= lowFrom && availableUnits <= lowTo) return 'low';
  if (availableUnits >= stableAt) return 'stable';

  // Policy specifies no status for AB stock from 15 through 19 units.
  return 'unclassified';
};

export const getAvailableRedCellUnits = (
  bloodUnits: BloodUnit[],
  bloodType: FullBloodType,
  facilityId: string,
) => bloodUnits.filter(unit =>
  unit.currentLocation.facilityId === facilityId
  && unit.bloodType === bloodType
  && isRedCellComponent(unit.component)
  && unit.status === 'Available'
  && unit.testingStatus.overall === 'Passed'
).length;

export const getAvailableRedCellComponentUnits = (
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

export const getFacilityBloodTypeStockLevel = (
  bloodUnits: BloodUnit[],
  bloodType: FullBloodType,
  facilityId: string,
) => getBloodTypeStockLevel(bloodType, getAvailableRedCellUnits(bloodUnits, bloodType, facilityId));

export const getFacilityRedCellComponentStockLevel = (
  bloodUnits: BloodUnit[],
  bloodType: FullBloodType,
  component: BloodComponentType,
  facilityId: string,
) => getBloodTypeStockLevel(
  bloodType,
  getAvailableRedCellComponentUnits(bloodUnits, bloodType, component, facilityId),
);
