import { z } from 'zod';
import { ROLES } from '../../middlewares/requireRole.js';

export const listUsers = z.object({
  role: z.enum(ROLES).optional(),
  isActive: z.string().optional().transform((v) => (v === undefined ? undefined : v === 'true')),
  q: z.string().trim().optional(),
  page: z.string().optional().default('1').transform((v) => Math.max(1, parseInt(v, 10) || 1)),
  pageSize: z.string().optional().default('20').transform((v) => Math.min(100, Math.max(1, parseInt(v, 10) || 20))),
});

export const createUser = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Invalid email address'),
  phone: z.string().trim().regex(/^\+?[0-9]{10,13}$/, 'Valid phone number required').optional().nullable(),
  role: z.enum(ROLES, { errorMap: () => ({ message: 'Invalid role' }) }),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  hourlyRate: z.number().nonnegative().optional().nullable(),
});

export const updateUser = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().regex(/^\+?[0-9]{10,13}$/).optional().nullable(),
  role: z.enum(ROLES).optional(),
  hourlyRate: z.number().nonnegative().optional().nullable(),
});

export const updateStatus = z.object({
  isActive: z.boolean(),
});

export const resetPassword = z.object({
  newPassword: z.string().min(8).optional(),
});

export const getTechnicians = z.object({
  type: z.enum(['survey', 'installation']).optional(),
});

