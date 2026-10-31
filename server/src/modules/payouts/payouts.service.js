import { Prisma } from '@prisma/client';
import { prisma } from '../../core/prisma.js';
import { AppError } from '../../core/AppError.js';
import { paginate } from '../../core/pagination.js';
import { dec, mul, add, toMoneyString } from '../../core/money.js';

/**
 * Generates DRAFT payout rows for a month from approved TimeLogs.
 *
 * Why: the director closes each month by generating payouts for all technicians;
 *      generating idempotently means re-running is safe.
 * Flow: find all active technicians → for each: sum approved minutes in the period →
 *       compute amount = (minutes/60) × hourlyRate + incentive → upsert a DRAFT row.
 * Example:
 *   await generatePayouts({ month: "2026-10" })
 *   // → [{ technicianId, totalMinutes, amount, status: "DRAFT" }, ...]
 * Throws: AppError 400 if month is malformed.
 */
export async function generatePayouts({ month }) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new AppError(400, 'INVALID_MONTH', 'month must be YYYY-MM.');

  const year = parseInt(match[1], 10);
  const m = parseInt(match[2], 10) - 1;
  const periodStart = new Date(Date.UTC(year, m, 1));
  const periodEnd = new Date(Date.UTC(year, m + 1, 0, 23, 59, 59, 999));

  const technicians = await prisma.user.findMany({
    where: {
      role: { in: ['SURVEY_TECHNICIAN', 'INSTALLATION_TECHNICIAN'] },
      isActive: true,
    },
    select: { id: true, name: true, role: true, hourlyRate: true },
  });

  const results = [];
  for (const tech of technicians) {
    const timeLogs = await prisma.timeLog.findMany({
      where: {
        technicianId: tech.id,
        approved: true,
        startedAt: { gte: periodStart, lte: periodEnd },
      },
      select: { minutes: true },
    });

    const totalMinutes = timeLogs.reduce((acc, t) => acc + t.minutes, 0);
    const hourlyRate = tech.hourlyRate ? dec(tech.hourlyRate) : new Prisma.Decimal(0);
    const amount = mul(dec(totalMinutes).dividedBy(60), hourlyRate);

    const payout = await prisma.payout.upsert({
      where: {
        technicianId_periodStart_periodEnd: {
          technicianId: tech.id,
          periodStart,
          periodEnd,
        },
      },
      create: {
        technicianId: tech.id,
        periodStart,
        periodEnd,
        totalMinutes,
        hourlyRate,
        incentive: new Prisma.Decimal(0),
        amount,
        status: 'DRAFT',
      },
      update: {
        totalMinutes,
        amount,
      },
    });

    results.push({ ...payout, amount: toMoneyString(payout.amount), hourlyRate: toMoneyString(payout.hourlyRate) });
  }

  return results;
}

/**
 * Lists payouts for a month with technician details.
 *
 * Throws: nothing.
 */
export async function listPayouts(query) {
  const { skip, take, meta } = paginate(query);
  const where = {};
  if (query.status) where.status = query.status;

  if (query.month) {
    const match = /^(\d{4})-(\d{2})$/.exec(query.month);
    if (match) {
      const year = parseInt(match[1], 10);
      const m = parseInt(match[2], 10) - 1;
      where.periodStart = { gte: new Date(Date.UTC(year, m, 1)) };
      where.periodEnd = { lte: new Date(Date.UTC(year, m + 1, 0, 23, 59, 59, 999)) };
    }
  }

  const [rows, total] = await Promise.all([
    prisma.payout.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        technician: { select: { name: true, role: true } },
      },
    }),
    prisma.payout.count({ where }),
  ]);

  return {
    data: rows.map(serializePayout),
    meta: meta(total),
  };
}

/**
 * Returns a single payout with detailed time log breakdown.
 *
 * Throws: AppError 404.
 */
export async function getPayout(id) {
  const payout = await prisma.payout.findUnique({
    where: { id },
    include: {
      technician: { select: { name: true, role: true, email: true } },
    },
  });
  if (!payout) throw new AppError(404, 'NOT_FOUND', 'Payout not found.');

  const timeLogs = await prisma.timeLog.findMany({
    where: {
      technicianId: payout.technicianId,
      approved: true,
      startedAt: { gte: payout.periodStart, lte: payout.periodEnd },
    },
    orderBy: { startedAt: 'asc' },
  });

  return { ...serializePayout(payout), timeLogs };
}

/**
 * Approves a DRAFT payout.
 *
 * Throws: AppError 404, 409.
 */
export async function approvePayout(id) {
  const payout = await prisma.payout.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!payout) throw new AppError(404, 'NOT_FOUND', 'Payout not found.');
  if (payout.status !== 'DRAFT') throw new AppError(409, 'INVALID_STATUS', 'Only DRAFT payouts can be approved.');

  return serializePayout(await prisma.payout.update({ where: { id }, data: { status: 'APPROVED' } }));
}

/**
 * Marks an APPROVED payout as PAID with a reference.
 *
 * Throws: AppError 404, 409.
 */
export async function markPayoutPaid(id, data) {
  const payout = await prisma.payout.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!payout) throw new AppError(404, 'NOT_FOUND', 'Payout not found.');
  if (payout.status !== 'APPROVED') throw new AppError(409, 'INVALID_STATUS', 'Only APPROVED payouts can be marked paid.');

  return serializePayout(
    await prisma.payout.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date(), reference: data.reference ?? null },
    }),
  );
}

/**
 * Lists technician time logs pending approval.
 *
 * Throws: nothing.
 */
export async function listPendingTimeLogs(query) {
  const { skip, take, meta } = paginate(query);
  const where = { approved: false };
  if (query.technicianId) where.technicianId = query.technicianId;

  const [rows, total] = await Promise.all([
    prisma.timeLog.findMany({
      where,
      skip,
      take,
      orderBy: { startedAt: 'desc' },
      include: { technician: { select: { name: true, role: true } } },
    }),
    prisma.timeLog.count({ where }),
  ]);

  return { data: rows, meta: meta(total) };
}

/**
 * Approves a time log so it is included in the next payout generation.
 *
 * Throws: AppError 404.
 */
export async function approveTimeLog(id) {
  const log = await prisma.timeLog.findUnique({ where: { id }, select: { id: true } });
  if (!log) throw new AppError(404, 'NOT_FOUND', 'Time log not found.');
  return prisma.timeLog.update({ where: { id }, data: { approved: true } });
}

function serializePayout(p) {
  return {
    ...p,
    amount: toMoneyString(p.amount),
    incentive: toMoneyString(p.incentive),
    hourlyRate: toMoneyString(p.hourlyRate),
  };
}
