export const TrackingCarrier = {
  SPX: 'SPX',
  GHN: 'GHN',
  JNT: 'JNT',
} as const;

export type TrackingCarrier = (typeof TrackingCarrier)[keyof typeof TrackingCarrier];

const spxLegacyTrackingNumberPattern = /^SPXVN[A-Z0-9]{6,40}$/i;
const spxExpressOrInternationalPattern = /^VN(?!GH)[A-Z0-9]{8,40}$/i;
const ghnPrefixedTrackingNumberPattern = /^VNGH[A-Z0-9]{4,28}$/i;
const ghnTrackingNumberPattern = /^[A-Z0-9]{6,32}$/i;
const jntAutoTrackingNumberPattern = /^[0-9]{6,32}$/;
const jntTrackingNumberPattern = /^[A-Z0-9]{6,32}$/i;

const isSpxTrackingNumber = (trackingNumber: string): boolean =>
  spxLegacyTrackingNumberPattern.test(trackingNumber) ||
  spxExpressOrInternationalPattern.test(trackingNumber);

const isGhnTrackingNumber = (trackingNumber: string): boolean =>
  ghnPrefixedTrackingNumberPattern.test(trackingNumber) ||
  (
    ghnTrackingNumberPattern.test(trackingNumber) &&
    !isSpxTrackingNumber(trackingNumber) &&
    !jntAutoTrackingNumberPattern.test(trackingNumber)
  );

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

  if (ghnPrefixedTrackingNumberPattern.test(normalizedTrackingNumber)) {
    return TrackingCarrier.GHN;
  }

  if (
    normalizedTrackingNumber.startsWith('SPXVN') ||
    normalizedTrackingNumber.startsWith('VN')
  ) {
    return isSpxTrackingNumber(normalizedTrackingNumber) ? TrackingCarrier.SPX : null;
  }

  if (jntAutoTrackingNumberPattern.test(normalizedTrackingNumber)) {
    return TrackingCarrier.JNT;
  }

  if (isGhnTrackingNumber(normalizedTrackingNumber)) {
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
    return isSpxTrackingNumber(normalizedTrackingNumber);
  }

  if (carrier === TrackingCarrier.JNT) {
    return jntTrackingNumberPattern.test(normalizedTrackingNumber);
  }

  return isGhnTrackingNumber(normalizedTrackingNumber);
};
