import { prisma } from '../../core/prisma.js';
import { AppError } from '../../core/AppError.js';
import { paginate } from '../../core/pagination.js';

const SERIAL_SELECT = {
  id: true, serialNumber: true, status: true, unitCost: true,
  notes: true, createdAt: true, updatedAt: true,
  product: { select: { id: true, sku: true, name: true, category: true, warrantyMonths: true } },
  project: { select: { id: true, code: true } },
  warranty: { select: { id: true, startDate: true, endDate: true, voidReason: true } },
};

/**
 * Lists serial units with optional filters.
 * Why: warehouse inventory of serialized units by status.
 * Flow: build where, paginate.
 * Example: await listSerials({ status: 'IN_STOCK', productId: 'prod_123' })
 * Throws: nothing.
 */
export async function listSerials(query) {
  const { skip, take, meta } = paginate(query);
  const where = {};
  if (query.status) where.status = query.status;
  if (query.productId) where.productId = query.productId;
  if (query.projectId) where.projectId = query.projectId;
  if (query.search) {
    where.serialNumber = { contains: query.search, mode: 'insensitive' };
  }

  const [rows, total] = await prisma.$transaction([
    prisma.serialUnit.findMany({ where, select: SERIAL_SELECT, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.serialUnit.count({ where }),
  ]);
  return { rows, meta: meta(total) };
}

/**
 * Gets a serial unit by its serial number (BR-08).
 * Why: support lookup and scan validation both need this fast path.
 * Flow: findUnique by serialNumber.
 * Example: await getSerialByNumber('PANEL-2026-001')
 * Throws: AppError 404.
 */
export async function getSerialByNumber(serialNumber) {
  const serial = await prisma.serialUnit.findUnique({
    where: { serialNumber },
    include: {
      product: { select: { id: true, sku: true, name: true, category: true, warrantyMonths: true } },
      purchaseItem: { select: { id: true, purchaseId: true } },
      project: { select: { id: true, code: true, status: true } },
      dispatch: { select: { id: true, number: true, status: true } },
      warranty: {
        select: {
          id: true, startDate: true, endDate: true, voidReason: true,
          customer: { select: { id: true, name: true, phone: true } },
        },
      },
      replaces: { select: { id: true, serialNumber: true } },
      replacedBy: { select: { id: true, serialNumber: true } },
    },
  });
  if (!serial) throw new AppError('Serial number not found', 404, 'NOT_FOUND');

  // Derive warranty status
  const warrantyStatus = serial.warranty
    ? serial.warranty.voidReason ? 'VOID'
      : new Date() > new Date(serial.warranty.endDate) ? 'EXPIRED'
      : 'ACTIVE'
    : null;

  return { ...serial, warrantyStatus };
}

/**
 * Gets a serial unit by id.
 * Why: direct id lookup from dispatch scan.
 * Flow: findUnique by id.
 * Example: await getSerialById('cuid123')
 * Throws: AppError 404.
 */
export async function getSerialById(id) {
  const serial = await prisma.serialUnit.findUnique({
    where: { id },
    select: SERIAL_SELECT,
  });
  if (!serial) throw new AppError('Serial unit not found', 404, 'NOT_FOUND');
  return serial;
}
