import { z } from 'zod';
import { FinalStatus } from './final-status';

export const MAX_ORDER_NOTE_LENGTH = 512;

export const trackingNumberSchema = z
  .string()
  .trim()
  .regex(/^SPXVN[A-Z0-9]{6,40}$/i, 'Tracking number must look like SPXVN063015366786')
  .transform((value) => value.toUpperCase());

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

export const createTrackingOrderSchema = z.object({
  trackingNumber: trackingNumberSchema,
  telegramChatId: z.string().trim().min(1).max(64).optional().default('api'),
  note: orderNoteSchema.optional(),
});

export const trackingNumberParamsSchema = z.object({
  trackingNumber: trackingNumberSchema,
});

export const listOrdersQuerySchema = z.object({
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
});

export const listHistoriesQuerySchema = z.object({
  trackingNumber: trackingNumberFilterSchema.optional(),
  telegramChatId: z.string().trim().min(1).max(64).optional(),
  userId: z.coerce.number().int().positive().optional(),
  telegramUserId: z.string().trim().min(1).max(64).optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export const removeOrderQuerySchema = z.object({
  telegramChatId: z.string().trim().min(1).max(64).optional().default('api'),
});
