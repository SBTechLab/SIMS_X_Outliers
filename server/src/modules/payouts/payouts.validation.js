import { z } from 'zod';

export const payoutId = z.object({ id: z.string().min(1) });
export const timeLogId = z.object({ id: z.string().min(1) });

export const generatePayouts = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM'),
});

export const markPaid = z.object({
  reference: z.string().optional(),
});

export const listQuery = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  status: z.enum(['DRAFT', 'APPROVED', 'PAID']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const timeLogQuery = z.object({
  technicianId: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
