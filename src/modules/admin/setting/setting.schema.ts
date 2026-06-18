import { z } from 'zod';

export const updateSettingSchema = z.object({
  adminContact: z.string().trim().min(1).max(128),
  maintenanceEnabled: z.boolean(),
});
