import { prisma } from '../../core/prisma.js';
import { AppError } from '../../core/AppError.js';
import { paginate } from '../../core/pagination.js';

const PRODUCT_SELECT = {
  id: true, sku: true, name: true, category: true, brand: true,
  unit: true, isSerialized: true, warrantyMonths: true,
  costPrice: true, sellPrice: true, taxPercent: true,
  reorderLevel: true, stockQty: true, isActive: true,
  createdAt: true, updatedAt: true,
};

/**
 * Lists products with optional filters.
 * Why: warehouse needs browseable catalogue with category and stock filters.
 * Flow: build where, paginate, return rows.
 * Example: await listProducts({ category: 'PANEL', isActive: true })
 * Throws: nothing.
 */
export async function listProducts(query) {
  const { skip, take, meta } = paginate(query);
  const where = {};
  if (query.category) where.category = query.category;
  if (query.isSerialized !== undefined) where.isSerialized = query.isSerialized === 'true' || query.isSerialized === true;
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true' || query.isActive === true;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { sku: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [rows, total] = await prisma.$transaction([
    prisma.product.findMany({ where, select: PRODUCT_SELECT, orderBy: { name: 'asc' }, skip, take }),
    prisma.product.count({ where }),
  ]);
  return { rows, meta: meta(total) };
}

/**
 * Gets one product by id.
 * Why: detail view + kit template builder needs full product data.
 * Flow: findUnique, throw 404 if missing.
 * Example: await getProduct("prod_123")
 * Throws: AppError 404.
 */
export async function getProduct(id) {
  const product = await prisma.product.findUnique({ where: { id }, select: { ...PRODUCT_SELECT, specs: true } });
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
  return product;
}

/**
 * Creates a product.
 * Why: warehouse manager adds new items to catalogue.
 * Flow: validate sku uniqueness, create.
 * Example: await createProduct({ sku: 'PANEL-540W', name: 'Panel 540Wp', ... })
 * Throws: AppError 409 on duplicate SKU.
 */
export async function createProduct(data) {
  const exists = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (exists) throw new AppError('SKU already exists', 409, 'DUPLICATE');
  return prisma.product.create({ data, select: PRODUCT_SELECT });
}

/**
 * Updates a product.
 * Why: prices, specs, and reorder levels change over time.
 * Flow: find, update, return.
 * Example: await updateProduct("prod_123", { costPrice: 18000 })
 * Throws: AppError 404.
 */
export async function updateProduct(id, data) {
  await getProduct(id);
  return prisma.product.update({ where: { id }, data, select: PRODUCT_SELECT });
}

/**
 * Adjusts non-serialized stock quantity.
 * Why: goods receipts and corrections for non-serialized items (cable, connectors, etc.)
 * Flow: verify not serialized, apply delta, return new stockQty.
 * Example: await adjustStock("prod_123", 50) // +50 meters of cable
 * Throws: AppError 400 if serialized, AppError 422 if stock goes negative.
 */
export async function adjustStock(id, delta, reason) {
  const product = await getProduct(id);
  if (product.isSerialized) throw new AppError('Serialized products use serial units — adjust stock via purchase', 400, 'INVALID');
  const newQty = product.stockQty + delta;
  if (newQty < 0) throw new AppError('Insufficient stock', 422, 'INSUFFICIENT_STOCK');
  return prisma.product.update({ where: { id }, data: { stockQty: newQty }, select: PRODUCT_SELECT });
}
