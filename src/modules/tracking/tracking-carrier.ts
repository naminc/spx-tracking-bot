export const TrackingCarrier = {
  SPX: 'SPX',
  GHN: 'GHN',
  JNT: 'JNT',
} as const;

export type TrackingCarrier = (typeof TrackingCarrier)[keyof typeof TrackingCarrier];

const spxTrackingNumberPattern = /^SPXVN[A-Z0-9]{6,40}$/i;
const ghnTrackingNumberPattern = /^[A-Z0-9]{6,32}$/i;
const jntAutoTrackingNumberPattern = /^[0-9]{6,32}$/;
const jntTrackingNumberPattern = /^[A-Z0-9]{6,32}$/i;

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

  if (jntAutoTrackingNumberPattern.test(normalizedTrackingNumber)) {
    return TrackingCarrier.JNT;
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

  if (carrier === TrackingCarrier.JNT) {
    return jntTrackingNumberPattern.test(normalizedTrackingNumber);
  }

  return ghnTrackingNumberPattern.test(normalizedTrackingNumber);
};
