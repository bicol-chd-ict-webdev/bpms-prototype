export const RETURN_REASONS = [
  'Mislabeled blood type',
  'Wrong component issued',
  'Leaking of blood components upon thawing',
] as const;

export type ReturnReason = typeof RETURN_REASONS[number];

export const hasValidReturnReasons = (reasons: readonly string[]): reasons is ReturnReason[] => (
  reasons.length > 0 && reasons.every(reason => RETURN_REASONS.includes(reason as ReturnReason))
);

export const formatReturnReasons = (reasons: readonly ReturnReason[]) => reasons.join('; ');
