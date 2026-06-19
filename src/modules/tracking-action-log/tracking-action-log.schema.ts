import { TrackingOrderActionSource, TrackingOrderActionType } from '@prisma/client';
import { z } from 'zod';

export const listTrackingOrderActionLogsQuerySchema = z.object({
  action: z.nativeEnum(TrackingOrderActionType).optional(),
  source: z.nativeEnum(TrackingOrderActionSource).optional(),
  trackingNumber: z.string().trim().min(1).max(64).transform((value) => value.toUpperCase()).optional(),
  telegramChatId: z.string().trim().min(1).max(64).optional(),
  userId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export type ListTrackingOrderActionLogsQuery = z.infer<
  typeof listTrackingOrderActionLogsQuerySchema
>;
