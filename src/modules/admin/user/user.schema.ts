import { z } from 'zod';

export const listUsersQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  profile: z.enum(['HAS_PROFILE', 'MISSING_PROFILE']).optional(),
  sort: z.enum(['CREATED_DESC', 'ORDERS_DESC', 'ORDERS_ASC']).optional().default('CREATED_DESC'),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const userIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const blockUserBodySchema = z
  .object({
    reason: z
      .string()
      .trim()
      .max(512)
      .transform((value) => value || null)
      .optional(),
  })
  .default({});

export const bulkDeleteUsersBodySchema = z.object({
  userIds: z
    .array(z.coerce.number().int().positive())
    .min(1)
    .max(200)
    .transform((userIds) => [...new Set(userIds)])
    .refine((userIds) => userIds.length > 0, {
      message: 'userIds must contain at least one user id',
    }),
});

export type UserIdParams = z.infer<typeof userIdParamsSchema>;
export type BlockUserBody = z.infer<typeof blockUserBodySchema>;
export type BulkDeleteUsersBody = z.infer<typeof bulkDeleteUsersBodySchema>;
