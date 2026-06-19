import { z } from 'zod';

export const listUsersQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  profile: z.enum(['HAS_PROFILE', 'MISSING_PROFILE']).optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
