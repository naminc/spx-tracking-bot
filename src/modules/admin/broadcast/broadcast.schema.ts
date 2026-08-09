import { z } from 'zod';

export const broadcastTargetTypeSchema = z.enum(['ALL_USERS', 'SELECTED_USERS']);
export const broadcastParseModeSchema = z.enum(['HTML']);

export const createBroadcastSchema = z
  .object({
    title: z
      .string()
      .trim()
      .max(255, 'Title must be at most 255 characters')
      .optional()
      .transform((value) => value || null),
    message: z
      .string()
      .trim()
      .min(1, 'Message is required')
      .max(4096, 'Message must be at most 4096 characters'),
    parseMode: broadcastParseModeSchema.optional().default('HTML'),
    targetType: broadcastTargetTypeSchema,
    userIds: z.array(z.coerce.number().int().positive()).optional().default([]),
  })
  .refine(
    (value) => value.targetType !== 'SELECTED_USERS' || value.userIds.length > 0,
    {
      message: 'Please select at least one user',
      path: ['userIds'],
    },
  );

export const broadcastIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type BroadcastTargetType = z.infer<typeof broadcastTargetTypeSchema>;
export type CreateBroadcastInput = z.infer<typeof createBroadcastSchema>;
