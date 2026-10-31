import { z } from 'zod';

export const invoiceId = z.object({ id: z.string().min(1) });

export const statusUpdate = z.object({
  status: z.enum(['ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED']),
});

export const listQuery = z.object({
  status: z.enum(['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED']).optional(),
  type: z.enum(['PROFORMA', 'TAX', 'SERVICE']).optional(),
  customerId: z.string().optional(),
  projectId: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
