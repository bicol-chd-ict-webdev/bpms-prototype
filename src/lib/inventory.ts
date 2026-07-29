import type { BloodUnit, UnitStatus, UserRole } from '../types/blood';

export const isTestedUnit = (unit: BloodUnit) =>
  unit.testingStatus.overall === 'Passed' || unit.testingStatus.overall === 'Failed';

export const isAvailableInventoryUnit = (unit: BloodUnit, role: UserRole) =>
  unit.testingStatus.overall === 'Passed'
  && unit.currentLocation.role === role
  && unit.status === 'Available';

export const getReactiveMarkers = (unit: BloodUnit) => {
  if (unit.testingStatus.overall === 'Passed') return 'Non-Reactive (All Screened Negative)';

  const markers = [
    unit.testingStatus.hiv === 'Positive' && 'HIV Positive',
    unit.testingStatus.hbv === 'Positive' && 'HBV Positive',
    unit.testingStatus.hcv === 'Positive' && 'HCV Positive',
    unit.testingStatus.syphilis === 'Positive' && 'Syphilis Positive',
    unit.testingStatus.malaria === 'Positive' && 'Malaria Positive',
  ].filter(Boolean);

  return markers.length ? markers.join(', ') : 'Reactive Infection Marker';
};

export const getInventoryStatusOptions = (role: UserRole): UnitStatus[] => (
  role === 'blood_bank'
    ? ['Available', 'Uncrossmatched', 'Crossmatched', 'Return Pending Review']
    : ['Available', 'Reserved', 'In Transit', 'Return Pending Review', 'Transfused', 'Discarded', 'Expired']
);
