import { prisma } from '../../core/prisma.js';
import { AppError } from '../../core/AppError.js';
import { toMoneyString } from '../../core/money.js';

/**
 * Returns the customer's own overview (projects, quotes, invoices counts).
 *
 * Why: portal dashboard summary.
 * Flow: find customer by userId, aggregate counts.
 * Throws: AppError 404 NOT_FOUND.
 */
export async function getOverview(actor) {
  const customer = await prisma.customer.findFirst({
    where: { userId: actor.id },
    select: {
      id: true, name: true, phone: true, email: true, city: true, customerType: true,
      _count: { select: { projects: true, quotes: true, invoices: true } },
    },
  });
  if (!customer) throw new AppError(404, 'NOT_FOUND', 'Customer profile not found.');
  return { customer };
}

/**
 * Returns the customer's projects.
 *
 * Throws: AppError 404 NOT_FOUND.
 */
export async function getMyProjects(actor) {
  const customer = await prisma.customer.findFirst({ where: { userId: actor.id }, select: { id: true } });
  if (!customer) throw new AppError(404, 'NOT_FOUND', 'Customer profile not found.');

  const projects = await prisma.project.findMany({
    where: { customerId: customer.id },
    select: {
      id: true, code: true, status: true, systemType: true, capacityKw: true,
      siteAddress: true, confirmedAt: true, createdAt: true,
      quote: { select: { number: true, total: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return projects.map((p) => ({
    ...p,
    capacityKw: Number(p.capacityKw),
    quote: p.quote ? { ...p.quote, total: toMoneyString(p.quote.total) } : null,
  }));
}

/**
 * Returns the customer's quotes.
 *
 * Throws: AppError 404 NOT_FOUND.
 */
export async function getMyQuotes(actor) {
  const customer = await prisma.customer.findFirst({ where: { userId: actor.id }, select: { id: true } });
  if (!customer) throw new AppError(404, 'NOT_FOUND', 'Customer profile not found.');

  const quotes = await prisma.quote.findMany({
    where: { customerId: customer.id },
    select: {
      id: true, number: true, status: true, systemType: true, capacityKw: true,
      subtotal: true, taxTotal: true, total: true, validUntil: true, sentAt: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return quotes.map((q) => ({
    ...q,
    capacityKw: Number(q.capacityKw),
    subtotal: toMoneyString(q.subtotal),
    taxTotal: toMoneyString(q.taxTotal),
    total: toMoneyString(q.total),
  }));
}

/**
 * Returns the customer's invoices.
 *
 * Throws: AppError 404 NOT_FOUND.
 */
export async function getMyInvoices(actor) {
  const customer = await prisma.customer.findFirst({ where: { userId: actor.id }, select: { id: true } });
  if (!customer) throw new AppError(404, 'NOT_FOUND', 'Customer profile not found.');

  const invoices = await prisma.invoice.findMany({
    where: { customerId: customer.id },
    select: {
      id: true, number: true, status: true, type: true,
      issueDate: true, dueDate: true,
      total: true, amountPaid: true,
      project: { select: { code: true } },
    },
    orderBy: { issueDate: 'desc' },
  });

  return invoices.map((i) => ({
    ...i,
    total: toMoneyString(i.total),
    amountPaid: toMoneyString(i.amountPaid),
  }));
}

/**
 * Returns the customer's payment history.
 *
 * Throws: AppError 404 NOT_FOUND.
 */
export async function getMyPayments(actor) {
  const customer = await prisma.customer.findFirst({ where: { userId: actor.id }, select: { id: true } });
  if (!customer) throw new AppError(404, 'NOT_FOUND', 'Customer profile not found.');

  const payments = await prisma.payment.findMany({
    where: { customerId: customer.id },
    select: {
      id: true, amount: true, type: true, mode: true, reference: true, receivedAt: true,
      project: { select: { code: true } },
    },
    orderBy: { receivedAt: 'desc' },
  });

  return payments.map((p) => ({ ...p, amount: toMoneyString(p.amount) }));
}

/**
 * Returns the customer's delivered systems with warranty info.
 *
 * Why: portal "My systems" page — shows each delivered solar system with warranty end dates.
 * Flow: find customer → find delivered dispatches → include serial units + warranties.
 * Throws: AppError 404 NOT_FOUND.
 */
export async function getMySystems(actor) {
  const customer = await prisma.customer.findFirst({ where: { userId: actor.id }, select: { id: true } });
  if (!customer) throw new AppError(404, 'NOT_FOUND', 'Customer profile not found.');

  const projects = await prisma.project.findMany({
    where: { customerId: customer.id, status: { in: ['INSTALLED', 'CLOSED'] } },
    select: {
      id: true, code: true, status: true, systemType: true, capacityKw: true, siteAddress: true, installedAt: true,
      dispatches: {
        where: { status: 'DELIVERED' },
        select: {
          deliveredAt: true,
          serialUnits: {
            select: {
              id: true, serialNumber: true, status: true,
              product: { select: { name: true, category: true } },
              warranty: {
                select: { id: true, startDate: true, endDate: true, voidReason: true },
              },
            },
          },
        },
      },
    },
    orderBy: { installedAt: 'desc' },
  });

  return projects.map((p) => ({
    ...p,
    capacityKw: Number(p.capacityKw),
    serialUnits: p.dispatches.flatMap((d) =>
      d.serialUnits.map((s) => ({
        ...s,
        warranty: s.warranty
          ? {
              ...s.warranty,
              status: s.warranty.voidReason ? 'VOID' : new Date() > new Date(s.warranty.endDate) ? 'EXPIRED' : 'ACTIVE',
            }
          : null,
      }))
    ),
    dispatches: undefined,
  }));
}
