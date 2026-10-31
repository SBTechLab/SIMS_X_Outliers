import { z } from 'zod';

export const createProject = z.object({
  quoteId: z.string().cuid(),
  siteAddress: z.string().trim().min(5).max(300),
  subsidyEligible: z.boolean().default(false),
});

export const listProjects = z.object({
  status: z.string().optional(),
  customerId: z.string().cuid().optional(),
  q: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const confirmProject = z.object({});

export const cancelProject = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const projectId = z.object({ id: z.string().cuid() });
