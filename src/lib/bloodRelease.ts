import type { BloodUnit } from '../types/blood';

export const NEAR_EXPIRY_DAYS = 5;

const toUtcDay = (date: Date | string) => {
  if (typeof date === 'string') {
    const [year, month, day] = date.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  }

  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
};

export const daysUntilExpiry = (expiryDate: string, today = new Date()) =>
  Math.round((toUtcDay(expiryDate) - toUtcDay(today)) / 86_400_000);

export const isNearExpiry = (unit: BloodUnit, today = new Date()) => {
  const daysRemaining = daysUntilExpiry(unit.expiryDate, today);
  return daysRemaining >= 0 && daysRemaining <= NEAR_EXPIRY_DAYS;
};

// Clinical FEFO takes precedence for units that expire within five days.
// Other eligible units retain FIFO ordering by donation date.
export const prioritizeUnitsForRelease = (units: BloodUnit[], today = new Date()) => units
  .filter(unit => daysUntilExpiry(unit.expiryDate, today) >= 0)
  .sort((left, right) => {
    const leftNearExpiry = isNearExpiry(left, today);
    const rightNearExpiry = isNearExpiry(right, today);

    if (leftNearExpiry !== rightNearExpiry) return leftNearExpiry ? -1 : 1;

    if (leftNearExpiry) {
      const expiryComparison = left.expiryDate.localeCompare(right.expiryDate);
      if (expiryComparison !== 0) return expiryComparison;
    }

    const donationComparison = left.donationDate.localeCompare(right.donationDate);
    if (donationComparison !== 0) return donationComparison;

    const expiryComparison = left.expiryDate.localeCompare(right.expiryDate);
    if (expiryComparison !== 0) return expiryComparison;

    return left.id.localeCompare(right.id);
  });
