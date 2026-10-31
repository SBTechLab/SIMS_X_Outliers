import { z } from 'zod';

export const listAuditLogs = z.object({
  userId: z.string().optional(),
  entityType: z.string().optional(),
  action: z.string().optional(),
  from: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  to: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  page: z.string().optional().default('1').transform((v) => Math.max(1, parseInt(v, 10) || 1)),
  pageSize: z.string().optional().default('25').transform((v) => Math.min(100, Math.max(1, parseInt(v, 10) || 25))),
});

