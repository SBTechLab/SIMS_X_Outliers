import { Prisma } from '@prisma/client';
import { prisma } from '../../core/prisma.js';
import { AppError } from '../../core/AppError.js';
import { emitEvent } from '../../core/events.js';
import { nextCode } from '../../core/codes.js';
import { paginate } from '../../core/pagination.js';
import { toMoneyString, add, mul, div } from '../../core/money.js';

const QUOTE_LIST_SELECT = {
  id: true, number: true, status: true, systemType: true, capacityKw: true,
  subtotal: true, discount: true, taxTotal: true, total: true, validUntil: true, sentAt: true, createdAt: true,
  customer: { select: { id: true, name: true } },
  lead: { select: { code: true } },
};

function computeTotals(items, discount = new Prisma.Decimal(0)) {
  let subtotal = new Prisma.Decimal(0);
  let taxTotal = new Prisma.Decimal(0);
  for (const item of items) {
    const line = mul(new Prisma.Decimal(item.quantity), new Prisma.Decimal(item.unitPrice));
    const tax = mul(line, div(new Prisma.Decimal(item.taxPercent), new Prisma.Decimal(100)));
    subtotal = add(subtotal, line);
    taxTotal = add(taxTotal, tax);
  }
  const discountDecimal = new Prisma.Decimal(discount);
  const total = add(add(subtotal, taxTotal), discountDecimal.neg());
  return { subtotal, taxTotal, total };
}

/**
 * Creates a quote by expanding a kit template's BOM (BR-04).
 *
 * Why: BR-03 survey gate + BR-04 auto-BOM. Creates customer if needed.
 * Flow: gate survey APPROVED, expand kit items, compute totals, create quote, advance lead.
 * Example:
 *   await createQuote({ leadId, kitTemplateId }, actor)
 * Throws: AppError 409 SURVEY_NOT_APPROVED, 404 NOT_FOUND.
 */
export async function createQuote(data, actor) {
  const lead = await prisma.lead.findUnique({
    where: { id: data.leadId },
    include: {
      surveys: { where: { status: 'APPROVED' }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead not found.');
  if (lead.surveys.length === 0) {
    throw new AppError(409, 'SURVEY_NOT_APPROVED', 'The lead must have an approved survey before a quote can be created (BR-03).');
  }

  const kit = await prisma.kitTemplate.findUnique({
    where: { id: data.kitTemplateId },
    include: {
      items: { include: { product: { select: { id: true, name: true, sku: true, sellPrice: true, taxPercent: true, isSerialized: true } } } },
    },
  });
  if (!kit) throw new AppError(404, 'NOT_FOUND', 'Kit template not found.');

  const settings = await prisma.setting.findMany({ where: { key: { in: ['defaultTaxPercent', 'quoteValidityDays'] } } });
  const quoteValidityDays = Number(settings.find((s) => s.key === 'quoteValidityDays')?.value ?? 15);

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + quoteValidityDays);

  const quote = await prisma.$transaction(async (tx) => {
    let customerId = lead.customerId;
    if (!customerId) {
      const customer = await tx.customer.create({
        data: { name: lead.name, phone: lead.phone, email: lead.email ?? undefined, addressLine: lead.address ?? undefined, city: lead.city ?? undefined, pincode: lead.pincode ?? undefined },
      });
      customerId = customer.id;
      await tx.lead.update({ where: { id: data.leadId }, data: { customerId } });
    }

    const itemsData = kit.items.map((item) => ({
      productId: item.product.id,
      description: item.product.name,
      quantity: new Prisma.Decimal(item.quantity),
      unitPrice: item.product.sellPrice,
      taxPercent: item.product.taxPercent,
      lineTotal: mul(new Prisma.Decimal(item.quantity), item.product.sellPrice),
    }));

    const { subtotal, taxTotal, total } = computeTotals(
      itemsData.map((i) => ({ quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), taxPercent: Number(i.taxPercent) })),
    );

    const number = await nextCode('QT', tx);

    const q = await tx.quote.create({
      data: {
        number,
        leadId: data.leadId,
        customerId,
        kitTemplateId: data.kitTemplateId,
        status: 'DRAFT',
        systemType: kit.systemType,
        capacityKw: kit.capacityKw,
        subtotal, taxTotal, total,
        validUntil,
        notes: data.notes ?? null,
        createdById: actor.id,
        items: { create: itemsData },
      },
      include: {
        items: { include: { product: { select: { sku: true, category: true, unit: true } } } },
        customer: { select: { id: true, name: true } },
      },
    });

    await tx.lead.update({ where: { id: data.leadId }, data: { status: 'QUOTED' } });
    return q;
  });

  return {
    ...quote,
    subtotal: toMoneyString(quote.subtotal),
    taxTotal: toMoneyString(quote.taxTotal),
    total: toMoneyString(quote.total),
    capacityKw: Number(quote.capacityKw),
    items: quote.items.map((i) => ({
      ...i,
      quantity: Number(i.quantity),
      unitPrice: toMoneyString(i.unitPrice),
      taxPercent: Number(i.taxPercent),
      lineTotal: toMoneyString(i.lineTotal),
    })),
  };
}

/**
 * Lists quotes with pagination, scoped by role.
 *
 * Why: sales board; customers see only own quotes.
 * Flow: scope CUSTOMER to customerId, filter, paginate.
 * Throws: nothing.
 */
export async function listQuotes(query, actor) {
  const { skip, take, meta } = paginate(query);
  const where = {};

  if (actor.role === 'CUSTOMER') where.customerId = actor.customerId;
  else {
    if (query.customerId) where.customerId = query.customerId;
    if (query.leadId) where.leadId = query.leadId;
  }
  if (query.status) where.status = query.status;
  if (query.q) {
    where.OR = [
      { number: { contains: query.q, mode: 'insensitive' } },
      { customer: { name: { contains: query.q, mode: 'insensitive' } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.quote.findMany({ where, select: QUOTE_LIST_SELECT, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.quote.count({ where }),
  ]);

  return {
    quotes: rows.map((q) => ({
      ...q,
      capacityKw: Number(q.capacityKw),
      subtotal: toMoneyString(q.subtotal),
      taxTotal: toMoneyString(q.taxTotal),
      total: toMoneyString(q.total),
      leadCode: q.lead?.code,
    })),
    meta: meta(total),
  };
}

/**
 * Returns a single quote with items. CUSTOMER scoped to own.
 *
 * Why: quote detail screen for sales and customer review.
 * Throws: AppError 404 NOT_FOUND, 403 FORBIDDEN.
 */
export async function getQuote(id, actor) {
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, phone: true, city: true } },
      lead: { select: { id: true, code: true, name: true } },
      kitTemplate: { select: { id: true, name: true } },
      items: {
        include: { product: { select: { sku: true, category: true, unit: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quote not found.');
  if (actor.role === 'CUSTOMER' && quote.customerId !== actor.customerId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this quote.');
  }
  return {
    ...quote,
    capacityKw: Number(quote.capacityKw),
    subtotal: toMoneyString(quote.subtotal),
    taxTotal: toMoneyString(quote.taxTotal),
    total: toMoneyString(quote.total),
    items: quote.items.map((i) => ({
      ...i,
      quantity: Number(i.quantity),
      unitPrice: toMoneyString(i.unitPrice),
      taxPercent: Number(i.taxPercent),
      lineTotal: toMoneyString(i.lineTotal),
    })),
  };
}

/**
 * Updates editable fields on a DRAFT quote. Recomputes totals.
 *
 * Why: sales tweaks discount or validity before sending.
 * Flow: verify DRAFT, update fields, recompute totals.
 * Throws: AppError 409 QUOTE_LOCKED.
 */
export async function updateQuote(id, data, actor) {
  const quote = await prisma.quote.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quote not found.');
  if (quote.status !== 'DRAFT') throw new AppError(409, 'QUOTE_LOCKED', 'Only DRAFT quotes can be edited.');

  const updated = await prisma.quote.update({
    where: { id },
    data: {
      ...(data.discount !== undefined && { discount: String(data.discount) }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.validUntil !== undefined && { validUntil: data.validUntil }),
      ...(data.capacityKw !== undefined && { capacityKw: String(data.capacityKw) }),
      ...(data.systemType !== undefined && { systemType: data.systemType }),
    },
    select: { id: true, status: true, total: true, discount: true, updatedAt: true },
  });

  return { ...updated, total: toMoneyString(updated.total), discount: toMoneyString(updated.discount) };
}

/**
 * Replaces the line items of a DRAFT quote. Recomputes totals.
 *
 * Why: sales adjusts the BOM before sending.
 * Throws: AppError 409 QUOTE_LOCKED.
 */
export async function replaceItems(id, data) {
  const quote = await prisma.quote.findUnique({ where: { id }, select: { id: true, status: true, discount: true } });
  if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quote not found.');
  if (quote.status !== 'DRAFT') throw new AppError(409, 'QUOTE_LOCKED', 'Only DRAFT quotes can have items replaced.');

  const products = await prisma.product.findMany({
    where: { id: { in: data.items.map((i) => i.productId) } },
    select: { id: true, name: true, sellPrice: true, taxPercent: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const itemsData = data.items.map((item) => {
    const prod = productMap.get(item.productId);
    if (!prod) throw new AppError(404, 'PRODUCT_NOT_FOUND', `Product ${item.productId} not found.`);
    const unitPrice = item.unitPrice != null ? new Prisma.Decimal(item.unitPrice) : prod.sellPrice;
    const taxPercent = item.taxPercent != null ? new Prisma.Decimal(item.taxPercent) : prod.taxPercent;
    const lineTotal = mul(new Prisma.Decimal(item.quantity), unitPrice);
    return {
      productId: item.productId,
      description: item.description ?? prod.name,
      quantity: new Prisma.Decimal(item.quantity),
      unitPrice,
      taxPercent,
      lineTotal,
    };
  });

  const { subtotal, taxTotal, total } = computeTotals(
    itemsData.map((i) => ({ quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), taxPercent: Number(i.taxPercent) })),
    quote.discount,
  );

  const updated = await prisma.$transaction(async (tx) => {
    await tx.quoteItem.deleteMany({ where: { quoteId: id } });
    const q = await tx.quote.update({
      where: { id },
      data: { subtotal, taxTotal, total, items: { create: itemsData } },
      include: { items: { include: { product: { select: { sku: true, category: true, unit: true } } } } },
    });
    return q;
  });

  return {
    ...updated,
    total: toMoneyString(updated.total),
    items: updated.items.map((i) => ({
      ...i,
      quantity: Number(i.quantity),
      unitPrice: toMoneyString(i.unitPrice),
      taxPercent: Number(i.taxPercent),
      lineTotal: toMoneyString(i.lineTotal),
    })),
  };
}

/**
 * Sends the quote to the customer.
 *
 * Why: changes status to SENT so the customer can view and accept.
 * Flow: verify DRAFT and has items, set SENT + sentAt, emit quote.sent.
 * Throws: AppError 409 INVALID_TRANSITION, 422 QUOTE_EMPTY.
 */
export async function sendQuote(id) {
  const quote = await prisma.quote.findUnique({
    where: { id },
    select: { id: true, status: true, _count: { select: { items: true } } },
  });
  if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quote not found.');
  if (quote.status !== 'DRAFT') throw new AppError(409, 'INVALID_TRANSITION', `Quote is ${quote.status}, not DRAFT.`);
  if (quote._count.items === 0) throw new AppError(422, 'QUOTE_EMPTY', 'Cannot send a quote with no items.');

  const updated = await prisma.quote.update({
    where: { id }, data: { status: 'SENT', sentAt: new Date() },
    select: { id: true, status: true, sentAt: true },
  });

  emitEvent('quote.sent', { quoteId: id });
  return updated;
}

/**
 * Accepts a quote. Marks lead WON, emits quote.accepted (creates project).
 *
 * Why: customer or sales confirms the order.
 * Flow: check SENT + not expired, update ACCEPTED, lead WON, emit.
 * Throws: AppError 409 QUOTE_EXPIRED, 409 INVALID_TRANSITION, 403 FORBIDDEN.
 */
export async function acceptQuote(id, data, actor) {
  const quote = await prisma.quote.findUnique({
    where: { id },
    select: { id: true, status: true, validUntil: true, customerId: true, leadId: true },
  });
  if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quote not found.');
  if (actor.role === 'CUSTOMER' && quote.customerId !== actor.customerId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this quote.');
  }
  if (quote.status !== 'SENT') throw new AppError(409, 'INVALID_TRANSITION', `Quote is ${quote.status}, not SENT.`);
  if (new Date() > new Date(quote.validUntil)) throw new AppError(409, 'QUOTE_EXPIRED', 'This quote has expired.');

  const updated = await prisma.$transaction(async (tx) => {
    const q = await tx.quote.update({
      where: { id },
      data: { status: 'ACCEPTED', acceptedAt: new Date(), acceptedById: actor.id },
      select: { id: true, status: true, acceptedAt: true },
    });
    await tx.lead.update({ where: { id: quote.leadId }, data: { status: 'WON' } });
    return q;
  });

  emitEvent('quote.accepted', { quoteId: id, customerId: quote.customerId });
  return updated;
}

/**
 * Rejects a quote.
 *
 * Why: customer declined the offer.
 * Throws: AppError 409 INVALID_TRANSITION, 403 FORBIDDEN.
 */
export async function rejectQuote(id, data, actor) {
  const quote = await prisma.quote.findUnique({
    where: { id }, select: { id: true, status: true, customerId: true },
  });
  if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quote not found.');
  if (actor.role === 'CUSTOMER' && quote.customerId !== actor.customerId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this quote.');
  }
  if (!['SENT', 'DRAFT'].includes(quote.status)) {
    throw new AppError(409, 'INVALID_TRANSITION', `Quote is ${quote.status}, cannot reject.`);
  }

  const updated = await prisma.quote.update({
    where: { id }, data: { status: 'REJECTED' },
    select: { id: true, status: true },
  });
  return updated;
}
