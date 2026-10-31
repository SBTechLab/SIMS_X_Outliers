import { prisma } from './prisma.js';
import { logger } from './logger.js';

/**
 * In-app notifications — the stand-in for SMS and WhatsApp, which are out of scope.
 *
 * Created by listeners, not by user action. Neither helper throws into the request that
 * triggered it: a notification failure must never undo a confirmed order.
 */

/**
 * Notifies specific users.
 *
 * Why: used when the work already has an assignee — a technician, a sales executive, a customer.
 * Flow: drop empty ids, dedupe, insert with createMany so nine people cost one query.
 * Example:
 *   await notifyUsers([technicianId], {
 *     title: "Installation scheduled for 3 Nov",
 *     body: "PRJ-2026-0007, 3 kW On-Grid, Kukatpally.",
 *     link: "/field/jobs/job_7",
 *   })
 *   // → { created: 1 }
 * Throws: nothing — failures are logged.
 */
export async function notifyUsers(userIds, { title, body = null, link = null }, client = prisma) {
  const ids = [...new Set((userIds ?? []).filter(Boolean))];
  if (ids.length === 0) return { created: 0 };

  try {
    const result = await client.notification.createMany({
      data: ids.map((userId) => ({ userId, title, body, link })),
    });
    return { created: result.count };
  } catch (err) {
    logger.error({ err, userIds: ids, title }, 'failed to create notifications');
    return { created: 0 };
  }
}

/**
 * Notifies every active user in a role.
 *
 * Why: used when nobody owns the item yet — a new enquiry goes to all of sales, a confirmed
 *      order to all of the warehouse.
 * Flow: look up active users with that role, then hand off to notifyUsers.
 *       Inactive accounts are skipped (BR-15), so a deactivated user stops receiving work.
 * Example:
 *   await notifyRole("WAREHOUSE_MANAGER", {
 *     title: "PRJ-2026-0007 confirmed — pick list ready",
 *     body: "3 kW On-Grid for Vipul Mehta, Hyderabad.",
 *     link: "/warehouse/dispatches/dsp_7",
 *   })
 *   // → { created: 1 }
 * Throws: nothing — failures are logged.
 */
export async function notifyRole(role, payload, client = prisma) {
  try {
    const users = await client.user.findMany({
      where: { role, isActive: true },
      select: { id: true },
    });
    return notifyUsers(users.map((u) => u.id), payload, client);
  } catch (err) {
    logger.error({ err, role, title: payload?.title }, 'failed to resolve role for notification');
    return { created: 0 };
  }
}

/**
 * Notifies several roles at once.
 *
 * Example:
 *   await notifyRoles(["DIRECTOR", "SUPER_ADMIN"], { title: "PRJ-2026-0007 installed" })
 */
export async function notifyRoles(roles, payload, client = prisma) {
  let created = 0;
  for (const role of roles) {
    const result = await notifyRole(role, payload, client);
    created += result.created;
  }
  return { created };
}
