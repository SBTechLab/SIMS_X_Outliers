import { prisma } from './prisma.js';
import { logger } from './logger.js';

/** The audited actions (BR-18, SECURITY.md section 10). Use a constant, never a literal. */
export const AUDIT = Object.freeze({
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_STATUS_CHANGED: 'USER_STATUS_CHANGED',
  USER_PASSWORD_RESET: 'USER_PASSWORD_RESET',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  PRODUCT_PRICE_CHANGED: 'PRODUCT_PRICE_CHANGED',
  QUOTE_DISCOUNT_CHANGED: 'QUOTE_DISCOUNT_CHANGED',
  QUOTE_PRICE_OVERRIDDEN: 'QUOTE_PRICE_OVERRIDDEN',
  PAYMENT_RECORDED: 'PAYMENT_RECORDED',
  INVENTORY_ADJUSTED: 'INVENTORY_ADJUSTED',
  SERIAL_OVERRIDDEN: 'SERIAL_OVERRIDDEN',
  TICKET_BILLING_DECIDED: 'TICKET_BILLING_DECIDED',
  PROJECT_CANCELLED: 'PROJECT_CANCELLED',
  REPORT_SHARED: 'REPORT_SHARED',
  KIT_TEMPLATE_UPDATED: 'KIT_TEMPLATE_UPDATED',
});

/**
 * Writes an audit row for a sensitive action.
 *
 * Why: BR-18 — role changes, price changes, payments, serial overrides and billing decisions
 *      all need a who/when/what trail that cannot be edited afterwards.
 * Flow: strip any secret from before/after, then insert. Pass `tx` to make the audit row and
 *       the change it records succeed or fail together.
 * Example:
 *   await logAudit({ userId: user.id, action: AUDIT.USER_ROLE_CHANGED, entityType: "User",
 *                    entityId: target.id, before: { role: "SALES_EXECUTIVE" },
 *                    after: { role: "DIRECTOR" }, ip: req.ip }, tx)
 * Throws: nothing — an audit failure is logged but never fails the business action that
 *         produced it, since losing the change is worse than losing the log line.
 */
export async function logAudit(
  { userId, action, entityType, entityId, before, after, ip },
  client = prisma,
) {
  try {
    await client.auditLog.create({
      data: {
        userId: userId ?? null,
        action,
        entityType,
        entityId: entityId ?? null,
        before: scrub(before),
        after: scrub(after),
        ip: ip ?? null,
      },
    });
  } catch (err) {
    logger.error({ err, action, entityType, entityId }, 'failed to write audit log');
  }
}

/** Never let a hash or a token reach the audit table. */
const SECRET_KEYS = ['passwordHash', 'password', 'newPassword', 'currentPassword', 'token'];

function scrub(value) {
  if (!value || typeof value !== 'object') return value ?? null;
  const copy = {};
  for (const [k, v] of Object.entries(value)) {
    if (SECRET_KEYS.includes(k)) continue;
    copy[k] = v;
  }
  return Object.keys(copy).length ? copy : null;
}

/**
 * Builds a before/after pair containing only the fields that actually changed.
 *
 * Why: the audit log stores changed fields, never whole rows (SECURITY.md section 10).
 * Example:
 *   diff({ role: "SALES_EXECUTIVE", name: "Priya" }, { role: "DIRECTOR", name: "Priya" })
 *   // → { before: { role: "SALES_EXECUTIVE" }, after: { role: "DIRECTOR" } }
 */
export function diff(oldRow, newRow) {
  const before = {};
  const after = {};
  for (const key of Object.keys(newRow ?? {})) {
    const a = oldRow?.[key];
    const b = newRow[key];
    if (String(a) !== String(b)) {
      before[key] = a ?? null;
      after[key] = b ?? null;
    }
  }
  return { before: Object.keys(before).length ? before : null, after: Object.keys(after).length ? after : null };
}
