import { prisma } from '../../core/prisma.js';
import { AppError } from '../../core/AppError.js';
import { paginate } from '../../core/pagination.js';
import { toMoneyString } from '../../core/money.js';

/**
 * Lists subsidy applications with optional filters.
 *
 * Why: the DIRECTOR tracks PM Surya Ghar applications by status; the board view needs
 *      to show days-in-stage and flag anything stale.
 * Flow: query + count, attach daysInStage computed field.
 * Throws: nothing.
 */
export async function listSubsidies(query) {
  const { skip, take, meta } = paginate(query);
  const where = {};
  if (query.status) where.status = query.status;
  if (query.q) {
    where.OR = [
      { applicationRef: { contains: query.q, mode: 'insensitive' } },
      { project: { code: { contains: query.q, mode: 'insensitive' } } },
      { project: { customer: { name: { contains: query.q, mode: 'insensitive' } } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.subsidyApplication.findMany({
      where,
      skip,
      take,
      orderBy: { updatedAt: 'desc' },
      include: {
        project: {
          select: {
            code: true,
            capacityKw: true,
            customer: { select: { name: true, city: true } },
          },
        },
      },
    }),
    prisma.subsidyApplication.count({ where }),
  ]);

  return {
    data: rows.map(serializeSubsidy),
    meta: meta(total),
  };
}

/**
 * Returns a single subsidy application with attachments.
 *
 * Throws: AppError 404.
 */
export async function getSubsidy(id) {
  const sub = await prisma.subsidyApplication.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          code: true,
          capacityKw: true,
          customer: { select: { name: true, phone: true, email: true, city: true } },
        },
      },
    },
  });
  if (!sub) throw new AppError(404, 'NOT_FOUND', 'Subsidy application not found.');
  return serializeSubsidy(sub);
}

/**
 * Updates a subsidy application (status transitions, reference, dates, amounts).
 *
 * Why: staff record each milestone manually as the physical paperwork moves through
 *      the government portal.
 * Flow: validate status transition → update.
 * Throws: AppError 404, 409.
 */
export async function updateSubsidy(id, data) {
  const sub = await prisma.subsidyApplication.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!sub) throw new AppError(404, 'NOT_FOUND', 'Subsidy application not found.');

  if (data.status) {
    const allowed = {
      NOT_STARTED: ['DOCUMENTS_PENDING'],
      DOCUMENTS_PENDING: ['APPLIED', 'NOT_STARTED'],
      APPLIED: ['INSPECTION_DONE', 'DOCUMENTS_PENDING'],
      INSPECTION_DONE: ['APPROVED', 'APPLIED'],
      APPROVED: ['DISBURSED'],
      DISBURSED: [],
      REJECTED: [],
    };
    if (!allowed[sub.status]?.includes(data.status)) {
      throw new AppError(409, 'INVALID_TRANSITION', `Cannot move from ${sub.status} to ${data.status}.`);
    }
  }

  const updateData = {};
  if (data.status !== undefined) updateData.status = data.status;
  if (data.applicationRef !== undefined) updateData.applicationRef = data.applicationRef;
  if (data.scheme !== undefined) updateData.scheme = data.scheme;
  if (data.appliedAt !== undefined) updateData.appliedAt = data.appliedAt ? new Date(data.appliedAt) : null;
  if (data.inspectionAt !== undefined) updateData.inspectionAt = data.inspectionAt ? new Date(data.inspectionAt) : null;
  if (data.approvedAt !== undefined) updateData.approvedAt = data.approvedAt ? new Date(data.approvedAt) : null;
  if (data.disbursedAt !== undefined) updateData.disbursedAt = data.disbursedAt ? new Date(data.disbursedAt) : null;
  if (data.amountExpected !== undefined) updateData.amountExpected = data.amountExpected;
  if (data.amountReceived !== undefined) updateData.amountReceived = data.amountReceived;
  if (data.remarks !== undefined) updateData.remarks = data.remarks;

  return prisma.subsidyApplication.update({ where: { id }, data: updateData });
}

function serializeSubsidy(sub) {
  const now = new Date();
  const stageStart = sub.updatedAt ?? sub.createdAt;
  const daysInStage = Math.floor((now - stageStart) / 86400_000);
  return {
    ...sub,
    daysInStage,
    amountExpected: sub.amountExpected ? toMoneyString(sub.amountExpected) : null,
    amountReceived: sub.amountReceived ? toMoneyString(sub.amountReceived) : null,
  };
}
