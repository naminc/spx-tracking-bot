import { z } from 'zod';
import { paginationQueryFields } from '../../shared/validation/pagination.schema';
import { FinalStatus } from './final-status';
import {
  TrackingCarrier,
  detectTrackingCarrier,
  normalizeTrackingNumber,
} from './tracking-carrier';

export const MAX_ORDER_NOTE_LENGTH = 512;

export const trackingCarrierSchema = z.enum([
  TrackingCarrier.SPX,
  TrackingCarrier.GHN,
  TrackingCarrier.JNT,
]);

export const trackingCarrierHintSchema = z
  .enum(['AUTO', TrackingCarrier.SPX, TrackingCarrier.GHN, TrackingCarrier.JNT])
  .optional()
  .default('AUTO');

export const trackingNumberSchema = z
  .string()
  .trim()
  .min(6, 'Tracking number is too short')
  .max(64, 'Tracking number is too long')
  .transform(normalizeTrackingNumber)
  .refine((value) => detectTrackingCarrier(value) !== null, {
    message: 'Tracking number must be a valid SPX, GHN, or J&T code',
  });

export const trackingNumberFilterSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .transform((value) => value.toUpperCase());

export const orderNoteSchema = z
  .string()
  .trim()
  .max(MAX_ORDER_NOTE_LENGTH, `Note must be at most ${MAX_ORDER_NOTE_LENGTH} characters`)
  .transform((value) => value || null);

export const trackingCredentialSchema = z
  .string()
  .trim()
  .min(1)
  .max(128, 'Tracking credential is too long')
  .optional();

export const createTrackingOrderSchema = z.object({
  trackingNumber: trackingNumberSchema,
  carrier: trackingCarrierHintSchema,
  telegramChatId: z.string().trim().min(1).max(64).optional().default('api'),
  note: orderNoteSchema.optional(),
  trackingCredential: trackingCredentialSchema,
});

export const trackingNumberParamsSchema = z.object({
  trackingNumber: trackingNumberSchema,
});

export const listOrdersQuerySchema = z.object({
  ...paginationQueryFields,
  carrier: trackingCarrierSchema.optional(),
  trackingNumber: trackingNumberFilterSchema.optional(),
  telegramChatId: z.string().trim().min(1).max(64).optional(),
  userId: z.coerce.number().int().positive().optional(),
  telegramUserId: z.string().trim().min(1).max(64).optional(),
  finalStatus: z
    .enum([
      FinalStatus.PENDING,
      FinalStatus.DELIVERED,
      FinalStatus.FAILED,
      FinalStatus.CANCELLED,
    ])
    .optional(),
  includeCompleted: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  sort: z
    .enum(['UPDATED_DESC', 'CREATED_DESC', 'LAST_EVENT_DESC', 'STATUS'])
    .optional()
    .default('UPDATED_DESC'),
});

export const listHistoriesQuerySchema = z.object({
  ...paginationQueryFields,
  carrier: trackingCarrierSchema.optional(),
  trackingNumber: trackingNumberFilterSchema.optional(),
  telegramChatId: z.string().trim().min(1).max(64).optional(),
  userId: z.coerce.number().int().positive().optional(),
  telegramUserId: z.string().trim().min(1).max(64).optional(),
  sort: z
    .enum(['EVENT_DESC', 'EVENT_ASC', 'CREATED_DESC'])
    .optional()
    .default('EVENT_DESC'),
});

export const removeOrderQuerySchema = z.object({
  carrier: trackingCarrierHintSchema,
  telegramChatId: z.string().trim().min(1).max(64).optional().default('api'),
});

export const trackingCarrierQuerySchema = z.object({
  carrier: trackingCarrierHintSchema,
});
