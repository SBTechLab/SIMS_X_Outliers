import { Prisma } from '@prisma/client';
import { prisma } from '../../core/prisma.js';
import { AppError } from '../../core/AppError.js';
import { nextCode } from '../../core/codes.js';
import { paginate } from '../../core/pagination.js';
import { add, sum, dec, round2, taxOf, toMoneyString } from '../../core/money.js';
import { getSettings } from '../settings/settings.service.js';
import { notifyUsers, notifyRole } from '../../core/notify.js';

/**
 * Builds InvoiceLine data from quote items.
 *
 * Why: PROFORMA and TAX invoices both expand from the accepted quote; storing the description
 *      as text (not a productId join) means a reprint years later is identical.
 */
function quoteLinesToInvoiceLines(quoteItems) {
  return quoteItems.map((item) => {
    const lineTotal = round2(
      dec(item.quantity).times(dec(item.unitPrice)).times(
        dec(1).plus(dec(item.taxPercent).dividedBy(100)),
      ),
    );
    return {
      description: item.description || item.product?.name || 'Item',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxPercent: item.taxPercent,
      lineTotal,
    };
  });
}

/**
 * Computes subtotal, taxTotal, total from InvoiceLine data arrays.
 */
function computeInvoiceTotals(lines) {
  let subtotal = new Prisma.Decimal(0);
  let taxTotal = new Prisma.Decimal(0);
  for (const line of lines) {
    const base = round2(dec(line.quantity).times(dec(line.unitPrice)));
    subtotal = subtotal.plus(base);
    taxTotal = taxTotal.plus(taxOf(base, line.taxPercent));
  }
  return { subtotal: round2(subtotal), taxTotal: round2(taxTotal), total: round2(subtotal.plus(taxTotal)) };
}

/**
 * Creates a PROFORMA invoice on project.confirmed (listener target).
 *
 * Why: when a project is confirmed the customer needs a billing document immediately
 *      so they know the full value and can arrange the balance payment.
 * Flow: idempotency check → load quote + items → nextCode → create Invoice + lines in tx.
 * Example:
 *   await createProformaInvoice("prj_123")
 *   // → Invoice { number: "INV-2026-0001", type: "PROFORMA", ... }
 * Throws: AppError 404 if project or quote not found.
 */
export async function createProformaInvoice(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      quote: { include: { items: { include: { product: { select: { name: true } } } } } },
      customer: { select: { id: true, userId: true } },
    },
  });
  if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found.');
  if (!project.quote) throw new AppError(409, 'NO_QUOTE', 'Project has no quote.');

  const existing = await prisma.invoice.findFirst({
    where: { projectId, type: 'PROFORMA' },
    select: { id: true },
  });
  if (existing) return existing;

  const settings = await getSettings();
  const validDays = Number(settings.quoteValidityDays ?? 30);
  const issueDate = new Date();
  const dueDate = new Date(issueDate.getTime() + validDays * 86400_000);

  const lineData = quoteLinesToInvoiceLines(project.quote.items);
  const { subtotal, taxTotal, total } = computeInvoiceTotals(lineData);

  const invoice = await prisma.$transaction(async (tx) => {
    const number = await nextCode('INV', tx);
    return tx.invoice.create({
      data: {
        number,
        customerId: project.customerId,
        projectId,
        type: 'PROFORMA',
        status: 'ISSUED',
        issueDate,
        dueDate,
        subtotal,
        taxTotal,
        total,
        amountPaid: 0,
        lines: { create: lineData },
      },
    });
  });

  if (project.customer?.userId) {
    await notifyUsers([project.customer.userId], {
      title: `Invoice ${invoice.number} issued`,
      body: `Proforma invoice for your project: ₹${toMoneyString(total)}`,
      link: `/portal/invoices`,
    });
  }

  return invoice;
}

/**
 * Creates a SubsidyApplication for subsidy-eligible projects on project.confirmed.
 *
 * Why: the DIRECTOR must track PM Surya Ghar applications; auto-creating the row on
 *      confirmation means nothing falls through the cracks.
 * Throws: nothing — idempotent.
 */
export async function ensureSubsidyApplication(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { subsidyEligible: true },
  });
  if (!project?.subsidyEligible) return null;

  const existing = await prisma.subsidyApplication.findUnique({
    where: { projectId },
    select: { id: true },
  });
  if (existing) return existing;

  return prisma.subsidyApplication.create({
    data: {
      projectId,
      scheme: 'PM Surya Ghar Muft Bijli Yojana',
      status: 'NOT_STARTED',
    },
  });
}

/**
 * Creates a TAX invoice on installation.completed.
 *
 * Why: the full tax invoice is the definitive billing document; it replaces (or carries
 *      forward) the PROFORMA so the accounting trail is clean.
 * Flow: idempotency check → carry amountPaid from PROFORMA payments → create TAX invoice.
 * Throws: AppError 404 if project not found.
 */
export async function createTaxInvoice(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      quote: { include: { items: { include: { product: { select: { name: true } } } } } },
      customer: { select: { id: true, userId: true, name: true } },
      invoices: { include: { payments: true } },
    },
  });
  if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found.');
  if (!project.quote) throw new AppError(409, 'NO_QUOTE', 'Project has no quote.');

  const existingTax = project.invoices.find((i) => i.type === 'TAX');
  if (existingTax) return existingTax;

  const paidSoFar = sum(
    project.invoices.flatMap((i) => i.payments),
    (p) => p.amount,
  );

  const lineData = quoteLinesToInvoiceLines(project.quote.items);
  const { subtotal, taxTotal, total } = computeInvoiceTotals(lineData);
  const issueDate = new Date();

  const invoice = await prisma.$transaction(async (tx) => {
    const number = await nextCode('INV', tx);
    const inv = await tx.invoice.create({
      data: {
        number,
        customerId: project.customerId,
        projectId,
        type: 'TAX',
        status: paidSoFar.gte(total) ? 'PAID' : paidSoFar.gt(0) ? 'PARTIALLY_PAID' : 'ISSUED',
        issueDate,
        subtotal,
        taxTotal,
        total,
        amountPaid: paidSoFar,
        lines: { create: lineData },
      },
    });

    // Re-link all project payments to the new TAX invoice
    await tx.payment.updateMany({
      where: {
        projectId,
        invoiceId: { in: project.invoices.map((i) => i.id) },
      },
      data: { invoiceId: inv.id },
    });

    return inv;
  });

  if (project.customer?.userId) {
    await notifyUsers([project.customer.userId], {
      title: `Final invoice ${invoice.number} issued`,
      body: `Installation complete. Tax invoice: ₹${toMoneyString(total)}`,
      link: `/portal/invoices`,
    });
  }

  await notifyRole('DIRECTOR', {
    title: 'Installation completed',
    body: `Project tax invoice ${invoice.number} issued for ${project.customer?.name ?? 'customer'}.`,
    link: `/finance/invoices/${invoice.id}`,
  });

  return invoice;
}

/**
 * Creates a SERVICE invoice when a chargeable ticket is resolved (ticket.billable).
 *
 * Why: BR-11 — chargeable tickets are billed automatically from the parts + labour
 *      the technician recorded; no manual entry needed.
 * Throws: AppError 404 if ticket not found.
 */
export async function createServiceInvoice(ticketId, lines) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { customer: { select: { id: true, userId: true } } },
  });
  if (!ticket) throw new AppError(404, 'NOT_FOUND', 'Ticket not found.');

  const existing = await prisma.invoice.findFirst({
    where: { ticketId, type: 'SERVICE' },
    select: { id: true },
  });
  if (existing) return existing;

  const { subtotal, taxTotal, total } = computeInvoiceTotals(lines);

  const invoice = await prisma.$transaction(async (tx) => {
    const number = await nextCode('INV', tx);
    return tx.invoice.create({
      data: {
        number,
        customerId: ticket.customerId,
        ticketId,
        type: 'SERVICE',
        status: 'ISSUED',
        issueDate: new Date(),
        subtotal,
        taxTotal,
        total,
        amountPaid: 0,
        lines: { create: lines },
      },
    });
  });

  if (ticket.customer?.userId) {
    await notifyUsers([ticket.customer.userId], {
      title: `Service invoice ${invoice.number} issued`,
      body: `Service visit billing: ₹${toMoneyString(total)}`,
      link: `/portal/invoices`,
    });
  }

  return invoice;
}

/**
 * Updates amountPaid on the relevant invoice after a payment is recorded.
 *
 * Why: the payment.recorded event is the single place that keeps invoices in sync.
 *      Without this, the invoice status would never move from ISSUED to PAID.
 * Flow: find invoice (by invoiceId or the project's PROFORMA/TAX invoice) → sum all
 *       linked payments → update amountPaid + status in a transaction.
 * Throws: nothing — if no invoice is found, silently returns.
 */
export async function syncInvoiceAfterPayment(paymentId, projectId) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { invoiceId: true, amount: true },
  });
  if (!payment) return;

  let invoiceId = payment.invoiceId;

  if (!invoiceId && projectId) {
    const inv = await prisma.invoice.findFirst({
      where: { projectId, type: { in: ['PROFORMA', 'TAX'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    invoiceId = inv?.id ?? null;
    if (invoiceId) {
      await prisma.payment.update({ where: { id: paymentId }, data: { invoiceId } });
    }
  }

  if (!invoiceId) return;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: { select: { amount: true } } },
  });
  if (!invoice) return;

  const totalPaid = sum(invoice.payments, (p) => p.amount);
  let status = invoice.status;
  if (totalPaid.gte(invoice.total)) status = 'PAID';
  else if (totalPaid.gt(0)) status = 'PARTIALLY_PAID';

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { amountPaid: totalPaid, status },
  });
}

/**
 * Lists invoices with optional filters, paginated.
 *
 * Throws: nothing.
 */
export async function listInvoices(query) {
  const { skip, take, meta } = paginate(query);
  const where = {};
  if (query.status) where.status = query.status;
  if (query.type) where.type = query.type;
  if (query.customerId) where.customerId = query.customerId;
  if (query.projectId) where.projectId = query.projectId;
  if (query.q) {
    where.OR = [
      { number: { contains: query.q, mode: 'insensitive' } },
      { customer: { name: { contains: query.q, mode: 'insensitive' } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take,
      orderBy: { issueDate: 'desc' },
      include: {
        customer: { select: { name: true, phone: true } },
        project: { select: { code: true } },
        _count: { select: { lines: true } },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    data: rows.map(serializeInvoice),
    meta: meta(total),
  };
}

/**
 * Returns a single invoice with all lines and payments.
 *
 * Throws: AppError 404.
 */
export async function getInvoice(id) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, phone: true, email: true, addressLine: true, city: true } },
      project: { select: { code: true, siteAddress: true } },
      ticket: { select: { number: true } },
      lines: { orderBy: { createdAt: 'asc' } },
      payments: { orderBy: { receivedAt: 'desc' }, include: { recordedBy: { select: { name: true } } } },
    },
  });
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Invoice not found.');
  return serializeInvoice(invoice);
}

/**
 * Updates the status of an invoice manually (e.g., DRAFT → ISSUED, or CANCELLED).
 *
 * Throws: AppError 404 or 409.
 */
export async function updateInvoiceStatus(id, status, actor) {
  const invoice = await prisma.invoice.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Invoice not found.');

  const allowed = {
    DRAFT: ['ISSUED', 'CANCELLED'],
    ISSUED: ['PARTIALLY_PAID', 'PAID', 'CANCELLED'],
    PARTIALLY_PAID: ['PAID', 'CANCELLED'],
    PAID: [],
    CANCELLED: [],
  };
  if (!allowed[invoice.status]?.includes(status)) {
    throw new AppError(409, 'INVALID_TRANSITION', `Cannot move invoice from ${invoice.status} to ${status}.`);
  }

  return prisma.invoice.update({ where: { id }, data: { status } });
}

function serializeInvoice(inv) {
  return {
    ...inv,
    subtotal: toMoneyString(inv.subtotal),
    taxTotal: toMoneyString(inv.taxTotal),
    total: toMoneyString(inv.total),
    amountPaid: toMoneyString(inv.amountPaid),
    lines: inv.lines?.map((l) => ({
      ...l,
      quantity: String(l.quantity),
      unitPrice: toMoneyString(l.unitPrice),
      taxPercent: String(l.taxPercent),
      lineTotal: toMoneyString(l.lineTotal),
    })),
    payments: inv.payments?.map((p) => ({ ...p, amount: toMoneyString(p.amount) })),
  };
}
