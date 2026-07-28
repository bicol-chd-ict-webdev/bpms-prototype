import type { BloodComponentType, FullBloodType } from '../types/blood';

export const BLOOD_GROUPS: FullBloodType[] = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

export const BLOOD_COMPONENTS: BloodComponentType[] = [
  'Packed Red Blood Cells (PRBC)',
  'Fresh Frozen Plasma (FFP)',
  'Platelet Concentrate',
  'Cryoprecipitate',
  'Whole Blood',
];

export const getComponentLabel = (component: BloodComponentType) => component.split('(')[0].trim();
