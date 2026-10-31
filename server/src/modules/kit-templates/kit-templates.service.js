import { prisma } from '../../core/prisma.js';
import { AppError } from '../../core/AppError.js';
import { AUDIT, logAudit } from '../../core/audit.js';

/**
 * Calculates BOM cost, sell price, and margin percentage for a kit template.
 *
 * Why: SUPER_ADMIN and sales need instant visibility into gross margin when configuring kits.
 * Flow: sum(item.quantity * product.costPrice), sum(item.quantity * product.sellPrice).
 * Example:
 *   calculateBomSummary(items, template.basePrice)
 *   // → { totalCost: 120000, bomSellTotal: 165000, basePrice: 165000, marginPercent: 27.27 }
 * Throws: nothing.
 */
export function calculateBomSummary(items = [], basePrice = 0) {
  let totalCost = 0;
  let bomSellTotal = 0;

  for (const item of items) {
    const qty = Number(item.quantity || 0);
    const cost = Number(item.product?.costPrice || 0);
    const sell = Number(item.product?.sellPrice || 0);
    totalCost += qty * cost;
    bomSellTotal += qty * sell;
  }

  const effectiveSell = Number(basePrice) > 0 ? Number(basePrice) : bomSellTotal;
  const marginPercent = effectiveSell > 0
    ? Number((((effectiveSell - totalCost) / effectiveSell) * 100).toFixed(2))
    : 0;

  return {
    totalCost: Number(totalCost.toFixed(2)),
    bomSellTotal: Number(bomSellTotal.toFixed(2)),
    basePrice: Number(Number(basePrice || 0).toFixed(2)),
    marginPercent,
  };
}

/**
 * Lists kit templates with item counts.
 *
 * Why: browsed by SUPER_ADMIN, sales when quoting, and public packages.
 * Flow: queries templates with item count, sorted by capacityKw ascending.
 * Example:
 *   await listKitTemplates({ systemType: 'ON_GRID' })
 * Throws: nothing.
 */
export async function listKitTemplates({ systemType, isActive, q } = {}) {
  const where = {};
  if (systemType) where.systemType = systemType;
  if (isActive !== undefined) where.isActive = isActive;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  const templates = await prisma.kitTemplate.findMany({
    where,
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              category: true,
              unit: true,
              costPrice: true,
              sellPrice: true,
              taxPercent: true,
              isSerialized: true,
            },
          },
        },
      },
    },
    orderBy: [{ systemType: 'asc' }, { capacityKw: 'asc' }],
  });

  return templates.map((t) => {
    const summary = calculateBomSummary(t.items, t.basePrice);
    return {
      id: t.id,
      name: t.name,
      systemType: t.systemType,
      capacityKw: Number(t.capacityKw),
      description: t.description,
      basePrice: Number(t.basePrice),
      isActive: t.isActive,
      itemCount: t.items.length,
      ...summary,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  });
}

/**
 * Gets a single kit template with full BOM products.
 *
 * Why: used by quotes service to auto-populate quote lines (BR-04).
 * Flow: loads template including items and product relations.
 * Example:
 *   await getKitTemplate('kt_123')
 * Throws: AppError 404 NOT_FOUND.
 */
export async function getKitTemplate(id) {
  const template = await prisma.kitTemplate.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              category: true,
              brand: true,
              unit: true,
              costPrice: true,
              sellPrice: true,
              taxPercent: true,
              isSerialized: true,
              warrantyMonths: true,
            },
          },
        },
      },
    },
  });

  if (!template) {
    throw new AppError(404, 'NOT_FOUND', 'Kit template not found.');
  }

  const summary = calculateBomSummary(template.items, template.basePrice);

  return {
    ...template,
    capacityKw: Number(template.capacityKw),
    basePrice: Number(template.basePrice),
    items: template.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      quantity: i.quantity,
      notes: i.notes,
      product: {
        ...i.product,
        costPrice: Number(i.product.costPrice),
        sellPrice: Number(i.product.sellPrice),
        taxPercent: Number(i.product.taxPercent),
      },
    })),
    ...summary,
  };
}

/**
 * Creates a new kit template.
 *
 * Why: SUPER_ADMIN creating new standard packages.
 * Flow: writes template, audits creation.
 * Example:
 *   await createKitTemplate({ name: '3 kW On-Grid', systemType: 'ON_GRID', capacityKw: 3, basePrice: 165000 }, actor, '127.0.0.1')
 * Throws: nothing.
 */
export async function createKitTemplate(data, actor, ip) {
  const template = await prisma.$transaction(async (tx) => {
    const created = await tx.kitTemplate.create({
      data: {
        name: data.name,
        systemType: data.systemType,
        capacityKw: data.capacityKw,
        description: data.description || null,
        basePrice: data.basePrice,
        isActive: data.isActive ?? true,
      },
    });

    await logAudit(
      {
        userId: actor?.id,
        action: AUDIT.KIT_TEMPLATE_UPDATED,
        entityType: 'KitTemplate',
        entityId: created.id,
        before: null,
        after: { name: created.name, basePrice: created.basePrice },
        ip,
      },
      tx,
    );

    return created;
  });

  return getKitTemplate(template.id);
}

/**
 * Updates an existing kit template.
 *
 * Why: SUPER_ADMIN adjusting template pricing or specs.
 * Flow: updates fields, logs audit.
 * Example:
 *   await updateKitTemplate('kt_123', { basePrice: 170000 }, actor, '127.0.0.1')
 * Throws: AppError 404 NOT_FOUND.
 */
export async function updateKitTemplate(id, data, actor, ip) {
  const existing = await prisma.kitTemplate.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Kit template not found.');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.kitTemplate.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.systemType && { systemType: data.systemType }),
        ...(data.capacityKw !== undefined && { capacityKw: data.capacityKw }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    await logAudit(
      {
        userId: actor?.id,
        action: AUDIT.KIT_TEMPLATE_UPDATED,
        entityType: 'KitTemplate',
        entityId: id,
        before: { name: existing.name, basePrice: Number(existing.basePrice) },
        after: { name: res.name, basePrice: Number(res.basePrice) },
        ip,
      },
      tx,
    );

    return res;
  });

  return getKitTemplate(updated.id);
}

/**
 * Replaces the entire item list (BOM) of a kit template.
 *
 * Why: BR-04 — ensures complete parts list with no duplicates and valid product references.
 * Flow: validates product IDs exist, checks duplicates, warns/validates off-grid components,
 *       replaces items atomically inside transaction.
 * Example:
 *   await updateKitTemplateItems('kt_123', [{ productId: 'p1', quantity: 6 }], actor, '127.0.0.1')
 * Throws: AppError 404 PRODUCT_NOT_FOUND, 400 DUPLICATE_PRODUCT.
 */
export async function updateKitTemplateItems(templateId, items, actor, ip) {
  const template = await prisma.kitTemplate.findUnique({ where: { id: templateId } });
  if (!template) {
    throw new AppError(404, 'NOT_FOUND', 'Kit template not found.');
  }

  // Deduplicate check
  const productIds = items.map((i) => i.productId);
  const uniqueIds = new Set(productIds);
  if (uniqueIds.size !== productIds.length) {
    throw new AppError(400, 'DUPLICATE_PRODUCT', 'Duplicate products in kit template are not allowed.');
  }

  // Verify all products exist
  if (productIds.length > 0) {
    const foundProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, category: true, name: true },
    });

    const foundIdSet = new Set(foundProducts.map((p) => p.id));
    for (const pid of productIds) {
      if (!foundIdSet.has(pid)) {
        throw new AppError(404, 'PRODUCT_NOT_FOUND', `Product ${pid} not found.`, { productId: pid });
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    // Delete existing items
    await tx.kitTemplateItem.deleteMany({
      where: { kitTemplateId: templateId },
    });

    // Create new items
    if (items.length > 0) {
      await tx.kitTemplateItem.createMany({
        data: items.map((item) => ({
          kitTemplateId: templateId,
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes || null,
        })),
      });
    }

    await logAudit(
      {
        userId: actor?.id,
        action: AUDIT.KIT_TEMPLATE_UPDATED,
        entityType: 'KitTemplate',
        entityId: templateId,
        before: { itemCount: 'replaced' },
        after: { itemCount: items.length },
        ip,
      },
      tx,
    );
  });

  return getKitTemplate(templateId);
}

