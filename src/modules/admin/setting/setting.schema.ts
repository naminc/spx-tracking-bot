import { z } from 'zod';

const telegramUserIdSchema = z
  .string()
  .trim()
  .regex(/^[1-9]\d*$/, 'Telegram User ID must contain digits only')
  .max(64);

export const updateSettingSchema = z
  .object({
    adminContact: z.string().trim().min(1).max(128),
    maintenanceEnabled: z.boolean(),
    restrictModeEnabled: z.boolean(),
    restrictModeMessage: z
      .string()
      .trim()
      .max(2048, 'Restriction message must be at most 2048 characters')
      .nullable()
      .optional()
      .transform((value) => value || null),
    restrictAllowedTelegramUserIds: z
      .array(telegramUserIdSchema)
      .max(5000, 'Restrict allow list cannot exceed 5000 users')
      .transform((ids) => [...new Set(ids)]),
  })
  .superRefine((value, context) => {
    if (value.restrictModeEnabled && !value.restrictModeMessage) {
      context.addIssue({
        code: 'custom',
        path: ['restrictModeMessage'],
        message: 'Restriction message is required when Restrict Mode is enabled',
      });
    }
  });

export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;
