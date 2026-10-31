import { z } from 'zod';

export const createQuote = z.object({
  leadId: z.string().cuid(),
  kitTemplateId: z.string().cuid(),
  notes: z.string().trim().max(1000).optional(),
});

export const listQuotes = z.object({
  status: z.string().optional(),
  leadId: z.string().cuid().optional(),
  customerId: z.string().cuid().optional(),
  q: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const updateQuote = z.object({
  discount: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(1000).optional().or(z.literal('').transform(() => null)),
  validUntil: z.coerce.date().optional(),
  capacityKw: z.coerce.number().positive().optional(),
  systemType: z.enum(['ON_GRID', 'OFF_GRID']).optional(),
});

export const replaceItems = z.object({
  items: z.array(z.object({
    productId: z.string().cuid(),
    description: z.string().trim().min(1).max(200).optional(),
    quantity: z.coerce.number().positive(),
    unitPrice: z.coerce.number().positive().optional(),
    taxPercent: z.coerce.number().min(0).max(100).optional(),
  })).min(1),
});

export const sendQuote = z.object({});

export const acceptQuote = z.object({
  acceptedByName: z.string().trim().max(120).optional(),
});

export const rejectQuote = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const quoteId = z.object({ id: z.string().cuid() });
