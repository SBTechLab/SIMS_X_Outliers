import { z } from 'zod';

export const subsidyId = z.object({ id: z.string().min(1) });

export const updateSubsidy = z.object({
  status: z.enum(['NOT_STARTED', 'DOCUMENTS_PENDING', 'APPLIED', 'INSPECTION_DONE', 'APPROVED', 'DISBURSED', 'REJECTED']).optional(),
  scheme: z.string().min(1).optional(),
  applicationRef: z.string().optional(),
  appliedAt: z.string().datetime({ offset: true }).optional().nullable(),
  inspectionAt: z.string().datetime({ offset: true }).optional().nullable(),
  approvedAt: z.string().datetime({ offset: true }).optional().nullable(),
  disbursedAt: z.string().datetime({ offset: true }).optional().nullable(),
  amountExpected: z.coerce.number().positive().optional().nullable(),
  amountReceived: z.coerce.number().positive().optional().nullable(),
  remarks: z.string().optional(),
});

export const listQuery = z.object({
  status: z.enum(['NOT_STARTED', 'DOCUMENTS_PENDING', 'APPLIED', 'INSPECTION_DONE', 'APPROVED', 'DISBURSED', 'REJECTED']).optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
