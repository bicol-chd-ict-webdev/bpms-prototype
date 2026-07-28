import { BloodComponentType } from '../types/blood';

const SHELF_LIFE_DAYS: Record<BloodComponentType, number> = {
  'Whole Blood': 35,
  'Packed Red Blood Cells (PRBC)': 42,
  'Fresh Frozen Plasma (FFP)': 365,
  'Platelet Concentrate': 5,
  'Cryoprecipitate': 365,
};

/**
 * Calculates a unit's expiry after its component and test result have been
 * recorded. The shelf life itself is always measured from collection date.
 */
export const calculateExpiryFromCollectionDate = (
  component: BloodComponentType,
  collectionDate: string,
) => {
  const collection = new Date(`${collectionDate}T00:00:00Z`);

  if (Number.isNaN(collection.getTime())) return '';

  collection.setUTCDate(collection.getUTCDate() + SHELF_LIFE_DAYS[component]);
  return collection.toISOString().slice(0, 10);
};
