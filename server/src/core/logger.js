import pino from 'pino';
import { env } from '../config/env.js';

/**
 * The single logger for the whole server. No console.log anywhere (RULES.md section 9).
 * Pretty-printed in development, JSON lines in production.
 */
export const logger = pino({
  level: env.isProduction ? 'info' : env.isTest ? 'silent' : 'debug',
  // Never log a password, a hash, a token or a cookie header (SECURITY.md section 9).
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'req.body.password',
      'req.body.newPassword',
      'req.body.currentPassword',
      'passwordHash',
      '*.passwordHash',
    ],
    censor: '[redacted]',
  },
  transport: env.isProduction || env.isTest
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
      },
});
