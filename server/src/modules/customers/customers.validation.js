import { z } from 'zod';

export const listCustomers = z.object({
  q: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const updateCustomer = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  altPhone: z.string().trim().regex(/^[6-9]\d{9}$/).optional().or(z.literal('').transform(() => null)),
  email: z.string().email().max(120).optional().or(z.literal('').transform(() => null)),
  addressLine: z.string().trim().max(300).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  notes: z.string().trim().max(1000).optional().or(z.literal('').transform(() => null)),
});

export const customerId = z.object({ id: z.string().cuid() });
