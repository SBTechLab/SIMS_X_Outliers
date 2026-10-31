/**
 * Every display format in the product, in one place (docs/DESIGN.md section 11).
 *
 * Screens call these; they never format inline. Money arrives from the API as a string so
 * Decimal precision survives the boundary — these functions read it, and never do arithmetic.
 */

const IST = 'Asia/Kolkata';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const inrWithPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Rupees with en-IN grouping. Whole amounts drop the paise.
 *
 * Example:
 *   formatINR("150000.00")  // → "₹1,50,000"
 *   formatINR("150000.50")  // → "₹1,50,000.50"
 *   formatINR("-12400.00")  // → "(₹12,400)"   negatives are parenthesised, not signed
 */
export function formatINR(value, { parensForNegative = true } = {}) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';

  const hasPaise = Math.round(Math.abs(n) * 100) % 100 !== 0;
  const formatted = (hasPaise ? inrWithPaise : inr).format(Math.abs(n));

  if (n < 0) return parensForNegative ? `(${formatted})` : `-${formatted}`;
  return formatted;
}

/**
 * Compact rupees for stat cards, in lakh and crore.
 *
 * Example:
 *   formatINRCompact("150000")   // → "₹1.5L"
 *   formatINRCompact("12400000") // → "₹1.2Cr"
 *   formatINRCompact("4200")     // → "₹4,200"
 */
export function formatINRCompact(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';

  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  return `${sign}${inr.format(abs)}`;
}

/** "31 Oct 2026" */
export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: IST,
  });
}

/** "31 Oct 2026, 2:30 pm" — IST, always. */
export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  const date = d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: IST,
  });
  return `${date}, ${formatTime(value)}`;
}

/** "2:30 pm" — 12-hour, lowercase. */
export function formatTime(value) {
  if (!value) return '—';
  return new Date(value)
    .toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: IST,
    })
    .toLowerCase()
    .replace(/\s/g, ' ');
}

/**
 * Relative time under a week, then the absolute date.
 *
 * Why: "4 hours ago" is what matters for a lead that has gone cold (BR-02); beyond a week it
 *      stops being useful and the real date reads better.
 * Example:
 *   timeAgo(fourHoursAgo)  // → "4 hours ago"
 *   timeAgo(lastMonth)     // → "18 Sep 2026"
 */
export function timeAgo(value) {
  if (!value) return '—';
  const then = new Date(value).getTime();
  const seconds = Math.round((Date.now() - then) / 1000);

  if (seconds < 0) return formatDateTime(value);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;

  return formatDate(value);
}

/** Days since a timestamp — the "days in stage" column on the unfinished report. */
export function daysSince(value) {
  if (!value) return null;
  return Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
}

/**
 * "+91 98480 12345" from the 10 digits we store.
 *
 * Example:
 *   formatPhone("9848012345") // → "+91 98480 12345"
 */
export function formatPhone(value) {
  if (!value) return '—';
  const digits = String(value).replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) return String(value);
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/** "3.0 kW" */
export function formatCapacity(value) {
  if (value === null || value === undefined || value === '') return '—';
  return `${Number(value).toFixed(1)} kW`;
}

/** "18.0%" */
export function formatPercent(value, digits = 1) {
  if (value === null || value === undefined || value === '') return '—';
  return `${Number(value).toFixed(digits)}%`;
}

/** "12 pcs", "45 m", "1 set", "2 h" — the unit comes from Product.unit. */
const UNIT_LABEL = { PCS: 'pcs', METER: 'm', SET: 'set', HOUR: 'h' };

export function formatQuantity(value, unit = 'PCS') {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  const shown = Number.isInteger(n) ? n : n.toFixed(2);
  return `${shown} ${UNIT_LABEL[unit] ?? ''}`.trim();
}

/** "3h 20m" from TimeLog.minutes. */
export function formatDuration(minutes) {
  if (minutes === null || minutes === undefined) return '—';
  const total = Math.round(Number(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** "420 sqft" */
export function formatArea(value) {
  if (value === null || value === undefined || value === '') return '—';
  return `${Number(value).toLocaleString('en-IN')} sqft`;
}

/** Initials for an Avatar: "Vipul Mehta" → "VM". */
export function initials(name) {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** An ISO date for a date input's value. */
export function toDateInputValue(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

/** An ISO datetime-local value, shifted to IST so the control shows what the user expects. */
export function toDateTimeInputValue(value) {
  if (!value) return '';
  const d = new Date(value);
  const ist = new Date(d.getTime() + (330 + d.getTimezoneOffset()) * 60000);
  return ist.toISOString().slice(0, 16);
}
