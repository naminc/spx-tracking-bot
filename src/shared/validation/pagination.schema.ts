import { z } from 'zod';

export const paginationQueryFields = {
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
};
