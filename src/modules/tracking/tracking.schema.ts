import { z } from 'zod';

export const trackingNumberSchema = z
  .string()
  .trim()
  .regex(/^SPXVN[A-Z0-9]{6,40}$/i, 'Tracking number must look like SPXVN063015366786')
  .transform((value) => value.toUpperCase());

export const createTrackingOrderSchema = z.object({
  trackingNumber: trackingNumberSchema,
  telegramChatId: z.string().trim().min(1).max(64).optional().default('api'),
});

export const trackingNumberParamsSchema = z.object({
  trackingNumber: trackingNumberSchema,
});

export const listOrdersQuerySchema = z.object({
  telegramChatId: z.string().trim().min(1).max(64).optional(),
  includeCompleted: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export const removeOrderQuerySchema = z.object({
  telegramChatId: z.string().trim().min(1).max(64).optional().default('api'),
});
