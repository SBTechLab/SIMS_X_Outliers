import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * Rate limiters, applied where an attacker gets the most value (SECURITY.md section 4).
 *
 * Why: /auth/login is the brute-force target, and /public/enquiries is the one
 *      unauthenticated write in the system — without a limit it is a lead-table flooder.
 */
const envelope = (code, message) => ({
  success: false,
  error: { code, message },
});

const base = {
  standardHeaders: true,
  legacyHeaders: false,
  // Disabled in test so the suite does not trip over its own requests.
  skip: () => env.isTest,
};

/** 10 attempts per 15 minutes per IP in production; higher in dev so 8 roles can be smoke-tested. */
export const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: env.isProduction ? 10 : 100,
  message: envelope('RATE_LIMITED', 'Too many sign-in attempts. Try again in 15 minutes.'),
});

/** 5 self-signups per hour per IP. */
export const registerLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: envelope('RATE_LIMITED', 'Too many sign-up attempts. Try again later.'),
});

/** 5 public enquiries per hour per IP. */
export const publicEnquiryLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: envelope(
    'RATE_LIMITED',
    'We have received several enquiries from you. Please call +91 40 2712 4188 instead.',
  ),
});

/** 30 shared-report views per hour per IP, so a token cannot be guessed by brute force. */
export const sharedReportLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 30,
  message: envelope('RATE_LIMITED', 'Too many requests. Try again later.'),
});
