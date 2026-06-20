export const TrackingCarrier = {
  SPX: 'SPX',
  GHN: 'GHN',
} as const;

export type TrackingCarrier = (typeof TrackingCarrier)[keyof typeof TrackingCarrier];

const spxTrackingNumberPattern = /^SPXVN[A-Z0-9]{6,40}$/i;
const ghnTrackingNumberPattern = /^[A-Z0-9]{6,32}$/i;

export const normalizeTrackingNumber = (trackingNumber: string): string =>
  trackingNumber.trim().toUpperCase();

export const detectTrackingCarrier = (
  trackingNumber: string,
  carrierHint?: TrackingCarrier | 'AUTO' | null,
): TrackingCarrier | null => {
  const normalizedTrackingNumber = normalizeTrackingNumber(trackingNumber);

  if (carrierHint && carrierHint !== 'AUTO') {
    return carrierHint;
  }

  if (normalizedTrackingNumber.startsWith('SPXVN')) {
    return spxTrackingNumberPattern.test(normalizedTrackingNumber)
      ? TrackingCarrier.SPX
      : null;
  }

  if (ghnTrackingNumberPattern.test(normalizedTrackingNumber)) {
    return TrackingCarrier.GHN;
  }

  return null;
};

export const isValidTrackingNumberForCarrier = (
  trackingNumber: string,
  carrier: TrackingCarrier,
): boolean => {
  const normalizedTrackingNumber = normalizeTrackingNumber(trackingNumber);

  if (carrier === TrackingCarrier.SPX) {
    return spxTrackingNumberPattern.test(normalizedTrackingNumber);
  }

  return ghnTrackingNumberPattern.test(normalizedTrackingNumber);
};
