import { prisma } from '../../core/prisma.js';
import { paginate } from '../../core/pagination.js';

/**
 * Returns inventory summary: stock levels for all active products.
 * Why: warehouse dashboard shows current stock per product with reorder status.
 * Flow: query all products, compute serialized counts, merge.
 * Example: await getInventory({})
 * Throws: nothing.
 */
export async function getInventory(query) {
  const { skip, take, meta } = paginate(query);
  const where = { isActive: true };
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { sku: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  if (query.category) where.category = query.category;

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      select: {
        id: true, sku: true, name: true, category: true, unit: true,
        isSerialized: true, reorderLevel: true, stockQty: true,
        _count: { select: { serialUnits: { where: { status: 'IN_STOCK' } } } },
      },
      orderBy: { name: 'asc' },
      skip, take,
    }),
    prisma.product.count({ where }),
  ]);

  const rows = products.map(p => ({
    ...p,
    availableQty: p.isSerialized ? p._count.serialUnits : p.stockQty,
    isBelowReorder: p.isSerialized
      ? p._count.serialUnits <= p.reorderLevel
      : p.stockQty <= p.reorderLevel,
    _count: undefined,
  }));

  return { rows, meta: meta(total) };
}

/**
 * Returns products below their reorder level.
 * Why: low-stock alert for the warehouse manager.
 * Flow: get all active products, filter those whose available <= reorderLevel.
 * Example: await getLowStock()
 * Throws: nothing.
 */
export async function getLowStock() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true, sku: true, name: true, category: true, unit: true,
      isSerialized: true, reorderLevel: true, stockQty: true,
      _count: { select: { serialUnits: { where: { status: 'IN_STOCK' } } } },
    },
  });

  return products
    .map(p => ({
      ...p,
      availableQty: p.isSerialized ? p._count.serialUnits : p.stockQty,
      _count: undefined,
    }))
    .filter(p => p.availableQty <= p.reorderLevel);
}
