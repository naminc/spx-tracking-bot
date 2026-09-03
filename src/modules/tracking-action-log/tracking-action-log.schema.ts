import { TrackingOrderActionSource, TrackingOrderActionType } from '@prisma/client';
import { z } from 'zod';
import { paginationQueryFields } from '../../shared/validation/pagination.schema';
import { TrackingCarrier } from '../tracking/tracking-carrier';

export const listTrackingOrderActionLogsQuerySchema = z.object({
  ...paginationQueryFields,
  carrier: z.enum([TrackingCarrier.SPX, TrackingCarrier.GHN, TrackingCarrier.JNT]).optional(),
  action: z.nativeEnum(TrackingOrderActionType).optional(),
  source: z.nativeEnum(TrackingOrderActionSource).optional(),
  trackingNumber: z.string().trim().min(1).max(64).transform((value) => value.toUpperCase()).optional(),
  telegramChatId: z.string().trim().min(1).max(64).optional(),
  userId: z.coerce.number().int().positive().optional(),
  sort: z.enum(['CREATED_DESC', 'CREATED_ASC']).optional().default('CREATED_DESC'),
});

export type ListTrackingOrderActionLogsQuery = z.infer<
  typeof listTrackingOrderActionLogsQuerySchema
>;
