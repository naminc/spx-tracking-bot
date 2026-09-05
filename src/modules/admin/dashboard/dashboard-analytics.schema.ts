import { z } from 'zod';
import { TrackingCarrier } from '../../tracking/tracking-carrier';

const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format');

export const dashboardAnalyticsQuerySchema = z.object({
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  carrier: z.enum([TrackingCarrier.SPX, TrackingCarrier.GHN, TrackingCarrier.JNT]).optional(),
});

export type DashboardAnalyticsQuery = z.infer<typeof dashboardAnalyticsQuerySchema>;
