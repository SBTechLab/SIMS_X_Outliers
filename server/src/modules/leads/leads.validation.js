import { z } from 'zod';

export const listLeads = z.object({
  status: z.string().optional(),
  source: z.string().optional(),
  assignedTo: z.string().optional(),
  overdue: z.coerce.boolean().optional(),
  q: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const createLead = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a 10-digit mobile number.'),
  email: z.string().trim().email().max(120).optional().or(z.literal('').transform(() => undefined)),
  address: z.string().trim().max(200).optional().or(z.literal('').transform(() => undefined)),
  city: z.string().trim().max(80).optional().or(z.literal('').transform(() => undefined)),
  pincode: z.string().trim().max(10).optional().or(z.literal('').transform(() => undefined)),
  source: z.enum(['WEB_FORM', 'WHATSAPP', 'PHONE_CALL', 'WALK_IN', 'REFERRAL']),
  requestedSystemType: z.enum(['ON_GRID', 'OFF_GRID', 'NOT_SURE']).default('NOT_SURE'),
  requestedCapacityKw: z.coerce.number().min(0.5).max(10).optional(),
  wantsSubsidy: z.coerce.boolean().default(false),
  assignedToId: z.string().cuid().optional(),
});

export const updateLead = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/).optional(),
  email: z.string().trim().email().max(120).optional().or(z.literal('').transform(() => undefined)),
  address: z.string().trim().max(200).optional().or(z.literal('').transform(() => undefined)),
  city: z.string().trim().max(80).optional().or(z.literal('').transform(() => undefined)),
  pincode: z.string().trim().max(10).optional().or(z.literal('').transform(() => undefined)),
  requestedSystemType: z.enum(['ON_GRID', 'OFF_GRID', 'NOT_SURE']).optional(),
  requestedCapacityKw: z.coerce.number().min(0.5).max(10).optional(),
  wantsSubsidy: z.coerce.boolean().optional(),
});

export const addActivity = z.object({
  type: z.enum(['CALL', 'WHATSAPP', 'EMAIL', 'VISIT', 'NOTE']),
  message: z.string().trim().min(1).max(1000),
});

export const qualify = z.object({
  qualified: z.boolean(),
  roofAreaSqft: z.coerce.number().int().positive().optional(),
  monthlyBillInr: z.coerce.number().positive().optional(),
  gridConnectionOk: z.coerce.boolean().optional(),
  sanctionedLoadKw: z.coerce.number().positive().optional(),
  qualificationNotes: z.string().trim().max(500).optional(),
});

export const assign = z.object({
  assignedToId: z.string().cuid(),
});

export const markLost = z.object({
  lostReason: z.string().trim().min(3).max(500),
});

export const leadId = z.object({
  id: z.string().cuid(),
});
