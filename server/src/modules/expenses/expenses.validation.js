import { z } from 'zod';

export const createExpense = z.object({
  projectId: z.string().optional(),
  ticketId: z.string().optional(),
  category: z.enum(['TRANSPORT', 'LABOUR_EXTRA', 'CIVIL_WORK', 'MISC']),
  amount: z.coerce.number().positive(),
  description: z.string().min(2).max(500),
  spentAt: z.string().datetime({ offset: true }),
});

export const listQuery = z.object({
  projectId: z.string().optional(),
  ticketId: z.string().optional(),
  category: z.enum(['TRANSPORT', 'LABOUR_EXTRA', 'CIVIL_WORK', 'MISC']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
