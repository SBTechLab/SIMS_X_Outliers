import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';
import { logger } from './logger.js';

/**
 * PrismaClient singleton.
 *
 * Why: `node --watch` re-imports modules on every save; without the global cache each
 *      reload would open a new connection pool until Postgres refused connections.
 */
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__sunpowerPrisma ??
  new PrismaClient({
    log: env.isProduction ? ['warn', 'error'] : ['warn', 'error'],
  });

if (!env.isProduction) globalForPrisma.__sunpowerPrisma = prisma;

/** Used by GET /health. Returns true when the database answers. */
export async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    logger.error({ err }, 'database health check failed');
    return false;
  }
}
