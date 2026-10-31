import { prisma } from '../../core/prisma.js';
import { AppError } from '../../core/AppError.js';
import { nextCode } from '../../core/codes.js';
import { paginate } from '../../core/pagination.js';
import { dec, sum, mul } from '../../core/money.js';

/**
 * Lists purchase orders.
 * Why: warehouse needs to browse procurement history.
 * Flow: paginate, include supplier and item count.
 * Example: await listPurchases({ page: 1 })
 * Throws: nothing.
 */
export async function listPurchases(query) {
  const { skip, take, meta } = paginate(query);
  const where = {};
  if (query.supplierId) where.supplierId = query.supplierId;

  const [rows, total] = await prisma.$transaction([
    prisma.purchase.findMany({
      where, skip, take, orderBy: { purchasedAt: 'desc' },
      include: {
        supplier: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.purchase.count({ where }),
  ]);
  return { rows, meta: meta(total) };
}

/**
 * Gets one purchase with full line detail.
 * Why: purchase detail view shows per-item quantities and serial numbers.
 * Flow: findUnique with deep includes.
 * Example: await getPurchase("prc_123")
 * Throws: AppError 404.
 */
export async function getPurchase(id) {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      createdBy: { select: { id: true, name: true } },
      items: {
        include: {
          product: { select: { id: true, sku: true, name: true, category: true, isSerialized: true, unit: true } },
          serialUnits: { select: { id: true, serialNumber: true, status: true } },
        },
      },
    },
  });
  if (!purchase) throw new AppError('Purchase not found', 404, 'NOT_FOUND');
  return purchase;
}

/**
 * Creates a purchase order with items and serial units (BR-08).
 * Why: every serialized unit must be registered at purchase with its serial number.
 * Flow: validate products, nextCode in tx, create purchase + items + serials, update stock.
 * Example: await createPurchase({ supplierId, items: [{ productId, qty, unitCost, serials: ['SNxx'] }] }, userId)
 * Throws: AppError 400 on duplicate serial, AppError 404 on missing product.
 */
export async function createPurchase(data, userId) {
  const { supplierId, invoiceRef, purchasedAt, items } = data;

  // Validate all products and serials up front
  const productIds = items.map(i => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  for (const item of items) {
    const product = productMap[item.productId];
    if (!product) throw new AppError(`Product ${item.productId} not found`, 404, 'NOT_FOUND');
    if (product.isSerialized && (!item.serials || item.serials.length === 0)) {
      throw new AppError(`Serialized product "${product.name}" requires serial numbers`, 400, 'VALIDATION_ERROR');
    }
    if (product.isSerialized && item.serials.length !== item.quantity) {
      throw new AppError(`Product "${product.name}" expects ${item.quantity} serial(s), got ${item.serials.length}`, 400, 'VALIDATION_ERROR');
    }
  }

  // Check for duplicate serials
  const allSerials = items.flatMap(i => i.serials || []);
  const existing = await prisma.serialUnit.findMany({ where: { serialNumber: { in: allSerials } }, select: { serialNumber: true } });
  if (existing.length > 0) {
    throw new AppError(`Serial number(s) already exist: ${existing.map(s => s.serialNumber).join(', ')}`, 409, 'DUPLICATE');
  }

  return prisma.$transaction(async (tx) => {
    const number = await nextCode(tx, 'PRC');

    // Compute total
    let total = dec(0);
    for (const item of items) {
      total = total.plus(mul(dec(item.quantity), dec(item.unitCost)));
    }

    const purchase = await tx.purchase.create({
      data: {
        number,
        supplierId,
        invoiceRef,
        purchasedAt: new Date(purchasedAt),
        total,
        createdById: userId,
      },
    });

    for (const item of items) {
      const product = productMap[item.productId];
      const purchaseItem = await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          productId: item.productId,
          quantity: dec(item.quantity),
          unitCost: dec(item.unitCost),
        },
      });

      if (product.isSerialized) {
        // Create one SerialUnit per serial number
        await tx.serialUnit.createMany({
          data: item.serials.map(sn => ({
            serialNumber: sn,
            productId: item.productId,
            purchaseItemId: purchaseItem.id,
            unitCost: dec(item.unitCost),
          })),
        });
      } else {
        // Update stockQty for non-serialized products
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { increment: item.quantity } },
        });
      }
    }

    return getPurchaseInTx(tx, purchase.id);
  });
}

async function getPurchaseInTx(tx, id) {
  return tx.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      createdBy: { select: { id: true, name: true } },
      items: {
        include: {
          product: { select: { id: true, sku: true, name: true, category: true, isSerialized: true, unit: true } },
          serialUnits: { select: { id: true, serialNumber: true, status: true } },
        },
      },
    },
  });
}

/**
 * Lists all suppliers.
 * Why: purchase form needs supplier dropdown.
 * Flow: findMany ordered by name.
 * Example: await listSuppliers()
 * Throws: nothing.
 */
export async function listSuppliers() {
  return prisma.supplier.findMany({ orderBy: { name: 'asc' } });
}

/**
 * Creates a supplier.
 * Why: warehouse manager registers new suppliers when needed.
 * Flow: create and return.
 * Example: await createSupplier({ name: 'SolarEdge India', phone: '9900001234' })
 * Throws: nothing.
 */
export async function createSupplier(data) {
  return prisma.supplier.create({ data });
}
