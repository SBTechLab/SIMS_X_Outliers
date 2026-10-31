import { prisma } from '../core/prisma.js';

/**
 * Expires quotes whose validity has passed.
 *
 * Why: PRD.md 6.3 — a SENT quote past validUntil must become EXPIRED, so it cannot be
 *      accepted at an old price (the accept endpoint also checks, as a belt and braces).
 * Flow: updateMany every DRAFT or SENT quote with validUntil before now.
 * Example:
 *   await expireQuotes()
 *   // → { expired: 3 }
 * Throws: nothing of its own; the caller in jobs/index.js logs any Prisma failure.
 */
export async function expireQuotes() {
  const result = await prisma.quote.updateMany({
    where: {
      status: { in: ['DRAFT', 'SENT'] },
      validUntil: { lt: new Date() },
    },
    data: { status: 'EXPIRED' },
  });

  return { expired: result.count };
}
