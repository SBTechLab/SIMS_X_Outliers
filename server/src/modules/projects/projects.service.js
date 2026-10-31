import { Prisma } from '@prisma/client';
import { prisma } from '../../core/prisma.js';
import { AppError } from '../../core/AppError.js';
import { emitEvent } from '../../core/events.js';
import { nextCode } from '../../core/codes.js';
import { paginate } from '../../core/pagination.js';
import { toMoneyString, mul, div } from '../../core/money.js';
import { getSettings } from '../settings/settings.service.js';

const PROJECT_LIST_SELECT = {
  id: true, code: true, status: true, systemType: true, capacityKw: true,
  siteAddress: true, confirmedAt: true, createdAt: true,
  customer: { select: { id: true, name: true, phone: true } },
  quote: { select: { number: true, total: true } },
};

/**
 * Creates a project from an accepted quote (called by quote.accepted listener).
 *
 * Why: quote.accepted event triggers project creation automatically.
 * Flow: gate ACCEPTED quote, nextCode('PRJ'), create project, emit project.created.
 * Throws: AppError 409 QUOTE_NOT_ACCEPTED, 409 PROJECT_EXISTS.
 */
export async function createProjectFromQuote(quoteId) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { customer: { select: { id: true } }, lead: { select: { assignedToId: true } } },
  });
  if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quote not found.');
  if (quote.status !== 'ACCEPTED') throw new AppError(409, 'QUOTE_NOT_ACCEPTED', 'Quote is not accepted.');

  const existing = await prisma.project.findUnique({ where: { quoteId } });
  if (existing) return existing;

  const siteAddress = await (async () => {
    const customer = await prisma.customer.findUnique({
      where: { id: quote.customerId },
      select: { addressLine: true, city: true, pincode: true },
    });
    return [customer?.addressLine, customer?.city, customer?.pincode].filter(Boolean).join(', ') || 'Site address TBD';
  })();

  const project = await prisma.$transaction(async (tx) => {
    const code = await nextCode('PRJ', tx);
    return tx.project.create({
      data: {
        code,
        customerId: quote.customerId,
        quoteId,
        status: 'AWAITING_ADVANCE',
        systemType: quote.systemType,
        capacityKw: quote.capacityKw,
        siteAddress,
        subsidyEligible: false,
      },
    });
  });

  emitEvent('project.created', { projectId: project.id });
  return project;
}

/**
 * Lists projects with pagination.
 *
 * Why: sales and director project board.
 * Throws: nothing.
 */
export async function listProjects(query) {
  const { skip, take, meta } = paginate(query);
  const where = {};
  if (query.status) where.status = query.status;
  if (query.customerId) where.customerId = query.customerId;
  if (query.q) {
    where.OR = [
      { code: { contains: query.q, mode: 'insensitive' } },
      { customer: { name: { contains: query.q, mode: 'insensitive' } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.project.findMany({ where, select: PROJECT_LIST_SELECT, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.project.count({ where }),
  ]);

  return {
    projects: rows.map((p) => ({
      ...p,
      capacityKw: Number(p.capacityKw),
      quote: p.quote ? { ...p.quote, total: toMoneyString(p.quote.total) } : null,
    })),
    meta: meta(total),
  };
}

/**
 * Returns a single project with related data.
 *
 * Throws: AppError 404 NOT_FOUND.
 */
export async function getProject(id) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, phone: true, city: true } },
      quote: { select: { id: true, number: true, total: true, capacityKw: true } },
      payments: { orderBy: { receivedAt: 'desc' } },
      invoices: { select: { id: true, number: true, status: true, total: true, dueDate: true } },
    },
  });
  if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found.');

  const payments = project.payments.map((p) => ({
    ...p,
    amount: toMoneyString(p.amount),
  }));
  return {
    ...project,
    capacityKw: Number(project.capacityKw),
    quote: project.quote ? { ...project.quote, total: toMoneyString(project.quote.total), capacityKw: Number(project.quote.capacityKw) } : null,
    payments,
    invoices: project.invoices.map((i) => ({ ...i, total: toMoneyString(i.total) })),
  };
}

/**
 * Confirms the project once advance has been received (BR-05).
 *
 * Why: BR-05 — project cannot proceed without the advance payment.
 * Flow: load project + quote + payments, check paid >= advancePercent%, update CONFIRMED.
 * Throws: AppError 409 ADVANCE_NOT_RECEIVED, 409 INVALID_TRANSITION.
 */
export async function confirmProject(id) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      quote: { select: { total: true } },
      payments: { select: { amount: true } },
    },
  });
  if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found.');
  if (project.status !== 'AWAITING_ADVANCE') {
    throw new AppError(409, 'INVALID_TRANSITION', `Project is ${project.status}, not AWAITING_ADVANCE.`);
  }

  const settings = await getSettings();
  const advancePct = new Prisma.Decimal(settings.advancePercent ?? 30);
  const required = mul(project.quote.total, div(advancePct, new Prisma.Decimal(100)));

  let paid = new Prisma.Decimal(0);
  for (const p of project.payments) {
    paid = paid.add(p.amount);
  }

  if (paid.lt(required)) {
    throw new AppError(409, 'ADVANCE_NOT_RECEIVED', 'Advance payment not received.', {
      required: toMoneyString(required),
      paid: toMoneyString(paid),
      shortfall: toMoneyString(required.sub(paid)),
    });
  }

  const updated = await prisma.project.update({
    where: { id },
    data: { status: 'CONFIRMED', confirmedAt: new Date() },
    select: { id: true, code: true, status: true, confirmedAt: true },
  });

  emitEvent('project.confirmed', { projectId: id });
  return updated;
}

/**
 * Cancels a project.
 *
 * Why: deal fell through or customer changed their mind.
 * Throws: AppError 409 INVALID_TRANSITION.
 */
export async function cancelProject(id, data) {
  const project = await prisma.project.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found.');
  if (['CLOSED', 'CANCELLED'].includes(project.status)) {
    throw new AppError(409, 'INVALID_TRANSITION', `Project is already ${project.status}.`);
  }

  const updated = await prisma.project.update({
    where: { id },
    data: { status: 'CANCELLED', cancelReason: data.reason },
    select: { id: true, status: true, cancelReason: true },
  });
  return updated;
}
