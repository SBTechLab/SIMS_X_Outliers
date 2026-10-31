import { prisma } from '../../core/prisma.js';
import { AppError } from '../../core/AppError.js';
import { paginate } from '../../core/pagination.js';

function deriveStatus(warranty) {
  if (warranty.voidReason) return 'VOID';
  if (new Date() > new Date(warranty.endDate)) return 'EXPIRED';
  return 'ACTIVE';
}

const WARRANTY_INCLUDE = {
  serialUnit: {
    include: {
      product: { select: { id: true, sku: true, name: true, category: true } },
    },
  },
  customer: { select: { id: true, name: true, phone: true, city: true } },
  project: { select: { id: true, code: true } },
};

/**
 * Lists warranties with optional customer/project filter.
 * Why: support can check all warranties for a customer.
 * Flow: paginate with includes, derive status.
 * Example: await listWarranties({ customerId: 'cust_123' })
 * Throws: nothing.
 */
export async function listWarranties(query) {
  const { skip, take, meta } = paginate(query);
  const where = {};
  if (query.customerId) where.customerId = query.customerId;
  if (query.projectId) where.projectId = query.projectId;
  if (query.status === 'ACTIVE') {
    where.endDate = { gte: new Date() };
    where.voidReason = null;
  } else if (query.status === 'EXPIRED') {
    where.endDate = { lt: new Date() };
    where.voidReason = null;
  } else if (query.status === 'VOID') {
    where.voidReason = { not: null };
  }

  const [rows, total] = await prisma.$transaction([
    prisma.warranty.findMany({ where, include: WARRANTY_INCLUDE, orderBy: { startDate: 'desc' }, skip, take }),
    prisma.warranty.count({ where }),
  ]);
  return { rows: rows.map(w => ({ ...w, status: deriveStatus(w) })), meta: meta(total) };
}

/**
 * Gets a single warranty by id.
 * Why: warranty detail view + support lookup.
 * Flow: findUnique with full include.
 * Example: await getWarranty("wrn_123")
 * Throws: AppError 404.
 */
export async function getWarranty(id) {
  const warranty = await prisma.warranty.findUnique({ where: { id }, include: WARRANTY_INCLUDE });
  if (!warranty) throw new AppError('Warranty not found', 404, 'NOT_FOUND');
  return { ...warranty, status: deriveStatus(warranty) };
}

/**
 * Voids a warranty (e.g. physical damage, tampering).
 * Why: some claims are rejected and warranty becomes void.
 * Flow: find, set voidReason.
 * Example: await voidWarranty("wrn_123", "Physical damage by customer")
 * Throws: AppError 404, AppError 422 if already void.
 */
export async function voidWarranty(id, voidReason) {
  const warranty = await getWarranty(id);
  if (warranty.voidReason) throw new AppError('Warranty is already void', 422, 'ALREADY_VOID');
  const updated = await prisma.warranty.update({ where: { id }, data: { voidReason }, include: WARRANTY_INCLUDE });
  return { ...updated, status: 'VOID' };
}
