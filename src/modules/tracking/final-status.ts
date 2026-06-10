export const FinalStatus = {
  PENDING: 'PENDING',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type FinalStatus = (typeof FinalStatus)[keyof typeof FinalStatus];
