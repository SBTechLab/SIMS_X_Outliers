import { Prisma } from '@prisma/client';

/**
 * Decimal helpers. Money is never a JS float (BR-14, D-08).
 *
 * Why: 0.1 + 0.2 is not 0.3. An 18% tax line over a 1,42,500 quote drifts by paise with
 *      floats, which is exactly the "the numbers do not reconcile" problem we exist to fix.
 */
const D = Prisma.Decimal;

/** Coerces anything (string, number, Decimal, null) to a Decimal. Null-ish becomes 0. */
export function dec(value) {
  if (value === null || value === undefined || value === '') return new D(0);
  return value instanceof D ? value : new D(value);
}

/** Rounds to 2 decimal places, half-up — the only rounding mode we use. */
export function round2(value) {
  return dec(value).toDecimalPlaces(2, D.ROUND_HALF_UP);
}

/** Sums a list of amounts, or of objects via a picker. */
export function sum(values, pick = (v) => v) {
  return values.reduce((acc, v) => acc.plus(dec(pick(v))), new D(0));
}

export function add(a, b) {
  return dec(a).plus(dec(b));
}

export function sub(a, b) {
  return dec(a).minus(dec(b));
}

export function mul(a, b) {
  return round2(dec(a).times(dec(b)));
}

export function div(a, b) {
  const divisor = dec(b);
  if (divisor.isZero()) return new D(0);
  return dec(a).dividedBy(divisor);
}

/** Tax amount for a base at a percentage. taxOf(1000, 18) returns 180.00 */
export function taxOf(base, percent) {
  return round2(dec(base).times(dec(percent)).dividedBy(100));
}

/** A percentage of an amount. percentOf(180000, 30) returns 54000.00 (BR-05). */
export function percentOf(amount, percent) {
  return round2(dec(amount).times(dec(percent)).dividedBy(100));
}

/** Margin as a percentage of revenue. Returns 0 when there is no revenue. */
export function marginPercent(profit, revenue) {
  const rev = dec(revenue);
  if (rev.isZero()) return new D(0);
  return dec(profit).times(100).dividedBy(rev).toDecimalPlaces(2, D.ROUND_HALF_UP);
}

export function gt(a, b) {
  return dec(a).greaterThan(dec(b));
}

export function gte(a, b) {
  return dec(a).greaterThanOrEqualTo(dec(b));
}

export function lt(a, b) {
  return dec(a).lessThan(dec(b));
}

export function isNegative(a) {
  return dec(a).isNegative();
}

/** Serialises for the API as a fixed-2 string, never a float (RULES.md section 6). */
export function toMoneyString(value) {
  return round2(value).toFixed(2);
}
