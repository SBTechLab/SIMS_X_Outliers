/** Shared helpers for the seed stages. Deterministic, so a reseed produces the same demo. */

/** Today, fixed once per run so every relative date in the seed is consistent. */
export const NOW = new Date();

/** Days from now (negative for the past), at 09:30 IST so timestamps look like working hours. */
export function daysFromNow(days, hour = 9, minute = 30) {
  const d = new Date(NOW);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** Months from now, used for the 18-month and 27-month warranty demos. */
export function monthsFromNow(months, hour = 11, minute = 0) {
  const d = new Date(NOW);
  d.setMonth(d.getMonth() + months);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** Date-only at UTC midnight, for scheduledDate and period fields. */
export function dateOnly(date) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/**
 * Adds whole months, clamping to the end of the target month.
 *
 * Why: BR-09 — 31 Jan plus one month must be 28/29 Feb, not 3 March. A naive setMonth
 *      rolls over, which would silently extend a warranty.
 */
export function addMonths(date, months) {
  const d = new Date(date);
  const targetDay = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(targetDay, lastDay));
  return d;
}

/** A human-readable code, matching core/codes.js exactly. */
export function code(prefix, n, year = NOW.getFullYear()) {
  return `${prefix}-${year}-${String(n).padStart(4, '0')}`;
}

/** Serial numbers that look like a real sticker: PREFIX-YYWW-NNNNN. */
export function serial(prefix, batch, n) {
  return `${prefix}-${batch}-${String(n).padStart(5, '0')}`;
}

/** Pick an item deterministically from a list. */
export function pick(list, i) {
  return list[i % list.length];
}

/** Rupees as a fixed-2 string, the shape Prisma Decimal columns accept. */
export function money(value) {
  return Number(value).toFixed(2);
}

/** Minutes between two timestamps, as TimeLog stores them. */
export function minutesBetween(start, end) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

/** Seeds the Counter table so the first code the running app generates follows the seed's. */
export function counterRows(highest) {
  const year = NOW.getFullYear();
  return Object.entries(highest).map(([prefix, value]) => ({ key: `${prefix}-${year}`, value }));
}
