import { z } from 'zod';

export const enquiry = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a 10-digit mobile number.'),
  email: z.string().trim().email().max(120).optional().or(z.literal('').transform(() => undefined)),
  address: z.string().trim().max(200).optional().or(z.literal('').transform(() => undefined)),
  city: z.string().trim().max(80).optional().or(z.literal('').transform(() => undefined)),
  pincode: z.string().trim().max(10).optional().or(z.literal('').transform(() => undefined)),
  requestedSystemType: z.enum(['ON_GRID', 'OFF_GRID', 'NOT_SURE']).optional(),
  requestedCapacityKw: z.coerce.number().min(0.5).max(10).optional(),
  wantsSubsidy: z.coerce.boolean().optional(),
});

export const token = z.object({ token: z.string().min(10).max(128) });
