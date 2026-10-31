import { Prisma } from '@prisma/client';
import { prisma } from '../../core/prisma.js';
import { AppError } from '../../core/AppError.js';
import { emitEvent } from '../../core/events.js';
import { paginate } from '../../core/pagination.js';
import { toMoneyString } from '../../core/money.js';

/**
 * Records a payment (money-recorded, not processed — D-05).
 *
 * Why: SIMS records what was received offline; it does not process transactions.
 * Flow: validate project/invoice existence, create payment, emit payment.recorded.
 * Throws: AppError 404 NOT_FOUND.
 */
export async function recordPayment(data, actor) {
  if (data.projectId) {
    const proj = await prisma.project.findUnique({ where: { id: data.projectId }, select: { id: true } });
    if (!proj) throw new AppError(404, 'NOT_FOUND', 'Project not found.');
  }
  if (data.invoiceId) {
    const inv = await prisma.invoice.findUnique({ where: { id: data.invoiceId }, select: { id: true } });
    if (!inv) throw new AppError(404, 'NOT_FOUND', 'Invoice not found.');
  }

  const payment = await prisma.payment.create({
    data: {
      projectId: data.projectId ?? null,
      invoiceId: data.invoiceId ?? null,
      customerId: data.customerId,
      amount: new Prisma.Decimal(data.amount),
      type: data.type,
      mode: data.mode,
      reference: data.reference ?? null,
      receivedAt: data.receivedAt,
      recordedById: actor.id,
    },
    include: {
      customer: { select: { name: true } },
      project: { select: { code: true } },
    },
  });

  emitEvent('payment.recorded', { paymentId: payment.id, projectId: data.projectId ?? null });
  return { ...payment, amount: toMoneyString(payment.amount) };
}

/**
 * Lists payments, paginated.
 *
 * Throws: nothing.
 */
export async function listPayments(query) {
  const { skip, take, meta } = paginate(query);
  const where = {};
  if (query.projectId) where.projectId = query.projectId;
  if (query.customerId) where.customerId = query.customerId;
  if (query.type) where.type = query.type;

  const [rows, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      skip, take,
      include: { customer: { select: { name: true } }, project: { select: { code: true } } },
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    payments: rows.map((p) => ({ ...p, amount: toMoneyString(p.amount) })),
    meta: meta(total),
  };
}

/**
 * Returns a single payment.
 *
 * Throws: AppError 404 NOT_FOUND.
 */
export async function getPayment(id) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { customer: { select: { name: true } }, project: { select: { code: true } } },
  });
  if (!payment) throw new AppError(404, 'NOT_FOUND', 'Payment not found.');
  return { ...payment, amount: toMoneyString(payment.amount) };
}
