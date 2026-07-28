import { BloodComponentType } from '../types/blood';

const SHELF_LIFE_DAYS: Partial<Record<BloodComponentType, number>> = {
  'Packed Red Blood Cells (PRBC)': 35,
  'Platelet Concentrate': 5,
};

export const getShelfLifeDays = (component: BloodComponentType) => SHELF_LIFE_DAYS[component] ?? null;

/**
 * Calculates expiry only where the supplied CPDA-1 policy defines shelf life.
 * The day after collection is Day 1, so the expiry date is collection date plus
 * the policy shelf-life day count.
 */
export const calculateExpiryFromCollectionDate = (
  component: BloodComponentType,
  collectionDate: string,
) => {
  const collection = new Date(`${collectionDate}T00:00:00Z`);

  if (Number.isNaN(collection.getTime())) return '';

  const shelfLifeDays = getShelfLifeDays(component);
  if (shelfLifeDays === null) return '';

  collection.setUTCDate(collection.getUTCDate() + shelfLifeDays);
  return collection.toISOString().slice(0, 10);
};
