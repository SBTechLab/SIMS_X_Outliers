import { AppError } from './AppError.js';

/**
 * Human-readable record codes from the Counter table (BR-17, D-12).
 *
 * People read these aloud on the phone and write them on cartons, so they must be short,
 * sequential and gap-free.
 */
export const CODE_PREFIXES = Object.freeze({
  ENQ: 'ENQ',
  QT: 'QT',
  PRJ: 'PRJ',
  DSP: 'DSP',
  TKT: 'TKT',
  INV: 'INV',
  PO: 'PO',
});

/**
 * Generates the next code for a prefix, inside the caller's transaction.
 *
 * Why: BR-17 — the number and the row it names must be atomic. Incrementing inside the
 *      transaction makes Postgres hold a lock on the counter row, so two simultaneous
 *      requests cannot read the same value, and a rolled-back quote does not burn a number.
 * Flow: upsert the Counter row for PREFIX-YEAR with an atomic increment, then format
 *       PREFIX-YEAR-0000 padded to four digits.
 * Example:
 *   const code = await nextCode("PRJ", tx)
 *   // → "PRJ-2026-0007"
 * Throws: AppError 500 COUNTER_FAILED if the prefix is unknown or no client was passed.
 */
export async function nextCode(prefix, client, now = new Date()) {
  if (!prefix || typeof prefix !== 'string') {
    throw new AppError(500, 'COUNTER_FAILED', 'A code prefix is required.');
  }
  if (!client || typeof client.counter?.upsert !== 'function') {
    // Calling this with the global prisma instead of tx appears to work, and then two
    // orders confirmed in the same second get the same code. Fail loudly instead.
    throw new AppError(500, 'COUNTER_FAILED', 'nextCode requires a Prisma client or transaction.');
  }

  const year = now.getFullYear();
  const key = `${prefix.toUpperCase()}-${year}`;

  const counter = await client.counter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });

  return formatCode(prefix, year, counter.value);
}

/**
 * Formats a code from its parts. Pads to 4 digits and simply grows past 9999.
 *
 * Example:
 *   formatCode("INV", 2026, 7)      // → "INV-2026-0007"
 *   formatCode("INV", 2026, 12345)  // → "INV-2026-12345"
 */
export function formatCode(prefix, year, value) {
  return `${prefix.toUpperCase()}-${year}-${String(value).padStart(4, '0')}`;
}
