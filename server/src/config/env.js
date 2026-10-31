import { z } from 'zod';

/**
 * Parses and validates process.env at boot.
 *
 * Why: a misconfigured server must fail loudly on start, not at the first request.
 *      A weak JWT_SECRET is a security hole, so there is deliberately no dev fallback.
 * Flow: read process.env -> zod schema -> throw with the field list, or return a frozen object.
 */
const schema = z.object({
  DATABASE_URL: z.string().url().startsWith('postgres'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CLIENT_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(5001),
  UPLOAD_DIR: z.string().default('./uploads'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${details}\n\nSee server/.env.example`);
}

export const env = Object.freeze({
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
  /** CORS allow-list. Comma-separated so staging and local can both be served. */
  allowedOrigins: parsed.data.CLIENT_URL.split(',').map((s) => s.trim()).filter(Boolean),
});
