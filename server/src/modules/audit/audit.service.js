import { prisma } from '../../core/prisma.js';

/**
 * Lists audit log entries with filters and pagination.
 *
 * Why: BR-18 — security and compliance inspection by SUPER_ADMIN and DIRECTOR.
 * Flow: builds Prisma where clause, fetches logs with actor user relation.
 * Example:
 *   await listAuditLogs({ action: 'USER_ROLE_CHANGED', page: 1, pageSize: 25 })
 * Throws: nothing.
 */
export async function listAuditLogs({ userId, entityType, action, from, to, page = 1, pageSize = 25 }) {
  const where = {};
  if (userId) where.userId = userId;
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, meta: { page, pageSize, total } };
}

