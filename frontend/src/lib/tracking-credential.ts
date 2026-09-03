import type { TrackingCarrier } from "./types/tracking";

type CarrierInput = TrackingCarrier | "AUTO";

const spxTrackingNumberPattern = /^(SPXVN[A-Z0-9]{6,40}|VN(?!GH)[A-Z0-9]{8,40})$/i;
const ghnTrackingNumberPattern = /^[A-Z0-9]{6,32}$/i;
const numericJntTrackingNumberPattern = /^[0-9]{6,32}$/;
const prefixedJntTrackingNumberPattern = /^JNT[A-Z0-9]{4,40}$/i;
const jntPhoneLast4Pattern = /^\d{4}$/;
const ghnPhoneVerifyPattern = /^[a-f0-9]{64}$/i;
const vietnamPhoneCandidatePattern = /^\+?[0-9\s.\-()]{9,20}$/;

export function isAutoGhnTrackingNumber(trackingNumber: string) {
  const normalizedTrackingNumber = trackingNumber.trim().toUpperCase();

  if (
    normalizedTrackingNumber.startsWith("SPX") ||
    (normalizedTrackingNumber.startsWith("VN") && !normalizedTrackingNumber.startsWith("VNGH"))
  ) {
    return false;
  }

  return (
    ghnTrackingNumberPattern.test(normalizedTrackingNumber) &&
    !spxTrackingNumberPattern.test(normalizedTrackingNumber) &&
    !isAutoJntTrackingNumber(normalizedTrackingNumber)
  );
}

export function isAutoJntTrackingNumber(trackingNumber: string) {
  const normalizedTrackingNumber = trackingNumber.trim().toUpperCase();

  return (
    numericJntTrackingNumberPattern.test(normalizedTrackingNumber) ||
    prefixedJntTrackingNumberPattern.test(normalizedTrackingNumber)
  );
}

export function shouldUseGhnCredential(carrier: CarrierInput, trackingNumber: string) {
  return carrier === "GHN" || (carrier === "AUTO" && isAutoGhnTrackingNumber(trackingNumber));
}

export function shouldUseJntCredential(carrier: CarrierInput, trackingNumber: string) {
  return (
    carrier === "JNT" ||
    (carrier === "AUTO" && isAutoJntTrackingNumber(trackingNumber))
  );
}

export function isValidGhnCredential(value: string) {
  const trimmedValue = value.trim();
  return ghnPhoneVerifyPattern.test(trimmedValue) || vietnamPhoneCandidatePattern.test(trimmedValue);
}

export function isValidJntCredential(value: string) {
  return jntPhoneLast4Pattern.test(value.trim());
}
