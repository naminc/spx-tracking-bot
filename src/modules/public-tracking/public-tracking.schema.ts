import { z } from 'zod';
import {
  TrackingCarrier,
  normalizeTrackingNumber,
} from '../tracking/tracking-carrier';

export const publicTrackingCarrierSchema = z
  .enum(['AUTO', TrackingCarrier.SPX, TrackingCarrier.GHN, TrackingCarrier.JNT])
  .optional()
  .default('AUTO');

export const publicTrackSchema = z.object({
  carrier: publicTrackingCarrierSchema,
  trackingNumber: z
    .string()
    .trim()
    .min(6, 'Tracking number is too short')
    .max(64, 'Tracking number is too long')
    .transform(normalizeTrackingNumber),
  trackingCredential: z.string().trim().regex(/^\d{4}$/, 'J&T phone last 4 must contain exactly 4 digits').optional(),
});

export type PublicTrackInput = z.infer<typeof publicTrackSchema>;
