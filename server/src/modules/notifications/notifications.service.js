import { prisma } from '../../core/prisma.js';
import { AppError } from '../../core/AppError.js';
import { paginate } from '../../core/pagination.js';

/**
 * Notifications are read-only to the user: they are created by listeners (core/notify.js),
 * and every query here is hard-scoped to the caller's own rows (BR-16).
 */

const select = {
  id: true,
  title: true,
  body: true,
  link: true,
  isRead: true,
  createdAt: true,
};

/**
 * Lists the caller's notifications, newest first.
 *
 * Why: BR-16 — userId comes from the session, never from the query, so there is no parameter
 *      that could point at someone else's notifications.
 * Flow: build the where clause from the session user plus the isRead filter -> paginated
 *       findMany + count in one transaction.
 * Example:
 *   await listNotifications(user, { page: 1, pageSize: 10 })
 *   // → { rows: [{ id: "ntf_31", title: "PRJ-2026-0007 confirmed..." }], total: 24 }
 * Throws: nothing.
 */
export async function listNotifications(user, query) {
  const { skip, take, meta } = paginate(query);
  const where = { userId: user.id };
  if (query.isRead !== undefined) where.isRead = query.isRead;

  const [rows, total] = await prisma.$transaction([
    prisma.notification.findMany({ where, select, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.notification.count({ where }),
  ]);

  return { rows, meta: meta(total) };
}

/**
 * Counts the caller's unread notifications.
 *
 * Why: the bell polls this every 30 seconds, so it is a single indexed count and nothing more
 *      (the Notification(userId, isRead) index exists for exactly this query).
 * Example:
 *   await unreadCount(user)
 *   // → { count: 3 }
 * Throws: nothing.
 */
export async function unreadCount(user) {
  const count = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });
  return { count };
}

/**
 * Marks one notification read.
 *
 * Why: BR-16. A row belonging to another user returns 404 rather than 403, so its existence is
 *      not confirmed (SECURITY.md section 11).
 * Flow: updateMany scoped to { id, userId } -> if nothing matched, throw 404 -> return the row.
 * Example:
 *   await markRead("ntf_31", user)
 *   // → { id: "ntf_31", isRead: true }
 * Throws: AppError 404 NOT_FOUND when there is no such notification for this user.
 */
export async function markRead(id, user) {
  const result = await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { isRead: true },
  });

  if (result.count === 0) throw new AppError(404, 'NOT_FOUND', 'Notification not found.');

  return prisma.notification.findUnique({ where: { id }, select });
}

/**
 * Marks every unread notification read.
 *
 * Example:
 *   await markAllRead(user)
 *   // → { updated: 7 }
 * Throws: nothing.
 */
export async function markAllRead(user) {
  const result = await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });
  return { updated: result.count };
}
