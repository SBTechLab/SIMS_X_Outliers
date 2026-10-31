import { Prisma } from '@prisma/client';
import { prisma } from '../../core/prisma.js';
import { AppError } from '../../core/AppError.js';
import { paginate } from '../../core/pagination.js';
import { toMoneyString } from '../../core/money.js';

/**
 * Records a project or ticket expense (BR-13 third term).
 *
 * Why: expenses are tracked per-project so the profit calculation can include transport,
 *      civil work, and incidentals without needing separate cost centres.
 * Flow: validate project/ticket exist → create Expense row.
 * Throws: AppError 404 NOT_FOUND.
 */
export async function createExpense(data, actor) {
  if (data.projectId) {
    const proj = await prisma.project.findUnique({ where: { id: data.projectId }, select: { id: true } });
    if (!proj) throw new AppError(404, 'NOT_FOUND', 'Project not found.');
  }
  if (data.ticketId) {
    const ticket = await prisma.ticket.findUnique({ where: { id: data.ticketId }, select: { id: true } });
    if (!ticket) throw new AppError(404, 'NOT_FOUND', 'Ticket not found.');
  }

  const expense = await prisma.expense.create({
    data: {
      projectId: data.projectId ?? null,
      ticketId: data.ticketId ?? null,
      category: data.category,
      amount: new Prisma.Decimal(data.amount),
      description: data.description,
      spentAt: new Date(data.spentAt),
      createdById: actor.id,
    },
    include: {
      project: { select: { code: true } },
      createdBy: { select: { name: true } },
    },
  });

  return { ...expense, amount: toMoneyString(expense.amount) };
}

/**
 * Lists expenses with optional filters, paginated.
 *
 * Throws: nothing.
 */
export async function listExpenses(query) {
  const { skip, take, meta } = paginate(query);
  const where = {};
  if (query.projectId) where.projectId = query.projectId;
  if (query.ticketId) where.ticketId = query.ticketId;
  if (query.category) where.category = query.category;

  const [rows, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip,
      take,
      orderBy: { spentAt: 'desc' },
      include: {
        project: { select: { code: true } },
        createdBy: { select: { name: true } },
      },
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    data: rows.map((e) => ({ ...e, amount: toMoneyString(e.amount) })),
    meta: meta(total),
  };
}
