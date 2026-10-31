import { z } from 'zod';

/**
 * Password rule, used by register, change-password and admin reset.
 * Identical on the client (SECURITY.md section 1): min 8, at least one letter and one number.
 */
export const password = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(72, 'Use at most 72 characters.')
  .regex(/[A-Za-z]/, 'Include at least one letter.')
  .regex(/[0-9]/, 'Include at least one number.');

/** 10-digit Indian mobile, stored without the +91 prefix. */
export const phone = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a 10-digit mobile number.');

/** An email or a 10-digit phone — staff sign in by email, customers by phone. */
export const login = z.object({
  identifier: z.string().trim().min(3, 'Enter your email or phone number.').max(120),
  password: z.string().min(1, 'Enter your password.').max(72),
});

export const register = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(120),
  phone,
  email: z.string().trim().email('Enter a valid email address.').max(120).optional(),
  password,
});

export const changePassword = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.').max(72),
  newPassword: password,
});
