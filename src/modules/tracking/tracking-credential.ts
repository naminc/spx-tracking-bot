import { createHash } from 'node:crypto';
import { TrackingCarrier } from './tracking-carrier';

export const ghnPhoneVerifyPattern = /^[a-f0-9]{64}$/i;
export const jntPhoneLast4Pattern = /^\d{4}$/;

const normalizeVietnamPhone = (value: string): string => {
  let normalizedValue = value.replace(/[\s.\-()]/g, '');

  if (normalizedValue.startsWith('+84')) {
    normalizedValue = `0${normalizedValue.slice(3)}`;
  } else if (normalizedValue.startsWith('84') && normalizedValue.length >= 10) {
    normalizedValue = `0${normalizedValue.slice(2)}`;
  } else if (normalizedValue !== '' && !normalizedValue.startsWith('0')) {
    normalizedValue = `0${normalizedValue}`;
  }

  if (normalizedValue.length < 9 || !/^\d+$/.test(normalizedValue)) {
    return '';
  }

  return normalizedValue;
};

export const isValidGhnTrackingCredential = (
  trackingNumber: string,
  trackingCredential: string | null | undefined,
): boolean => Boolean(normalizeGhnTrackingCredential(trackingNumber, trackingCredential));

export const normalizeGhnTrackingCredential = (
  trackingNumber: string,
  trackingCredential: string | null | undefined,
): string | null => {
  const trimmedCredential = trackingCredential?.trim() ?? '';

  if (!trimmedCredential) {
    return null;
  }

  if (ghnPhoneVerifyPattern.test(trimmedCredential)) {
    return trimmedCredential.toLowerCase();
  }

  const normalizedPhone = normalizeVietnamPhone(trimmedCredential);

  if (!normalizedPhone) {
    return null;
  }

  return createHash('sha256')
    .update(`${trackingNumber.trim().toUpperCase()}|${normalizedPhone}`)
    .digest('hex');
};

export const maskTrackingCredential = (
  carrier: TrackingCarrier,
  trackingCredential: string | null | undefined,
): string | null => {
  const trimmedCredential = trackingCredential?.trim() ?? '';

  if (!trimmedCredential) {
    return null;
  }

  if (carrier === TrackingCarrier.GHN && ghnPhoneVerifyPattern.test(trimmedCredential)) {
    return `${trimmedCredential.slice(0, 6)}...${trimmedCredential.slice(-4)}`;
  }

  return '****';
};
