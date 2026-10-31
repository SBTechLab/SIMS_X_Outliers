import { z } from 'zod';

export const idParam = z.object({ id: z.string().cuid() });

export const listQuery = z.object({
  isRead: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
