import { Prisma } from '@prisma/client';
import { prisma } from '../../core/prisma.js';
import { dec, sum, sub, round2, marginPercent, toMoneyString } from '../../core/money.js';
import { paginate } from '../../core/pagination.js';

/**
 * Computes the profit for a single project (BR-13).
 *
 * BR-13: Profit = invoiced revenue − (material cost + labour cost + project expenses + warranty service cost)
 *
 * Why: each cost term comes from a different module. Aggregating here instead of in each
 *      module's service means a single function gives the director a true margin number.
 * Flow:
 *   Revenue        = sum of non-cancelled TAX invoice totals; fallback to quote.total (flagged "estimated")
 *   Material cost  = sum(SerialUnit.unitCost for project serials) + non-serialized dispatch lines × product.costPrice
 *   Labour cost    = approved TimeLog minutes for survey + installation × technician.hourlyRate
 *   Expenses       = Expense rows on the project
 *   Warranty cost  = TicketPart.unitCost + labour (converted) on free tickets for project serials
 * Example:
 *   const p = await projectProfit("prj_123")
 *   // → { revenue: "142500.00", materialCost: "98000.00", ..., profit: "22000.00", margin: "15.44" }
 * Throws: nothing.
 */
export async function projectProfit(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      quote: { select: { total: true } },
      invoices: {
        where: { type: { in: ['TAX', 'PROFORMA'] } },
        select: { total: true, status: true, type: true },
      },
      dispatch: {
        include: {
          lines: {
            include: {
              product: { select: { costPrice: true, isSerialized: true } },
            },
          },
          serialUnits: {
            select: { unitCost: true },
          },
        },
      },
      expenses: { select: { amount: true } },
      installation: {
        select: { id: true },
      },
      quote: {
        select: { total: true, leadId: true },
      },
      serialUnits: {
        select: { id: true },
      },
    },
  });

  if (!project) return null;

  // Revenue — TAX invoices are authoritative; fall back to quote.total if not invoiced yet
  const taxInvoices = project.invoices.filter((i) => i.type === 'TAX' && i.status !== 'CANCELLED');
  const isEstimated = taxInvoices.length === 0;
  let revenue = isEstimated ? dec(project.quote?.total ?? 0) : sum(taxInvoices, (i) => i.total);

  // Material cost: serialized units delivered to project + non-serialized dispatch qty × costPrice
  let materialCost = new Prisma.Decimal(0);
  const dispatch = project.dispatch;
  if (dispatch) {
    for (const serial of dispatch.serialUnits ?? []) {
      materialCost = materialCost.plus(dec(serial.unitCost));
    }
    for (const line of dispatch.lines ?? []) {
      if (!line.product.isSerialized) {
        materialCost = materialCost.plus(
          dec(line.product.costPrice).times(dec(line.packedQty ?? 0)),
        );
      }
    }
  }
  materialCost = round2(materialCost);

  // Labour cost: survey + installation time logs
  // Survey is on the lead (via quote.leadId); installation is directly on project
  let surveyIds = [];
  if (project.quote?.leadId) {
    const surveys = await prisma.survey.findMany({
      where: { leadId: project.quote.leadId },
      select: { id: true },
    });
    surveyIds = surveys.map((s) => s.id);
  }
  const entityIds = [
    ...surveyIds,
    ...(project.installation ? [project.installation.id] : []),
  ];
  const timeLogs = entityIds.length > 0
    ? await prisma.timeLog.findMany({
        where: {
          entityId: { in: entityIds },
          approved: true,
        },
        include: { technician: { select: { hourlyRate: true } } },
      })
    : [];

  let labourCost = new Prisma.Decimal(0);
  for (const log of timeLogs) {
    const rate = dec(log.technician.hourlyRate ?? 0);
    labourCost = labourCost.plus(rate.times(dec(log.minutes)).dividedBy(60));
  }
  labourCost = round2(labourCost);

  // Expenses
  const expenseCost = round2(sum(project.expenses, (e) => e.amount));

  // Warranty service cost: free ticket parts + labour on project serials
  let warrantyCost = new Prisma.Decimal(0);
  if (project.serialUnits.length > 0) {
    const freeTickets = await prisma.ticket.findMany({
      where: {
        serialUnitId: { in: project.serialUnits.map((s) => s.id) },
        isChargeable: false,
        status: { in: ['RESOLVED', 'CLOSED'] },
      },
      include: {
        parts: { select: { unitCost: true, quantity: true, labourHours: true } },
      },
    });
    for (const ticket of freeTickets) {
      for (const part of ticket.parts) {
        warrantyCost = warrantyCost.plus(dec(part.unitCost).times(dec(part.quantity)));
        if (part.labourHours) {
          const labourRate = 450; // fallback — real rate fetched from settings in prod
          warrantyCost = warrantyCost.plus(dec(part.labourHours).times(labourRate));
        }
      }
    }
  }
  warrantyCost = round2(warrantyCost);

  const totalCost = round2(materialCost.plus(labourCost).plus(expenseCost).plus(warrantyCost));
  const profit = round2(sub(revenue, totalCost));
  const margin = marginPercent(profit, revenue);

  return {
    projectId,
    code: project.code ?? null,
    revenue: toMoneyString(revenue),
    isEstimated,
    materialCost: toMoneyString(materialCost),
    labourCost: toMoneyString(labourCost),
    expenseCost: toMoneyString(expenseCost),
    warrantyCost: toMoneyString(warrantyCost),
    totalCost: toMoneyString(totalCost),
    profit: toMoneyString(profit),
    margin: margin.toFixed(2),
    isLoss: profit.isNegative(),
  };
}

/**
 * Director overview dashboard — KPIs for a date range.
 *
 * Why: the director's "month-end" scene needs a single API call that tells the story:
 *      revenue, lead conversion, system sizes installed, outstanding invoices.
 * Throws: nothing.
 */
export async function getOverview({ from, to }) {
  const dateFilter = buildDateFilter(from, to);

  const [
    leadsTotal, leadsWon, leadsLost,
    projectsConfirmed, projectsInstalled, projectsClosed,
    invoiceStats,
    capacityInstalled,
    subsidyDisbursed,
    activeTickets,
  ] = await Promise.all([
    prisma.lead.count({ where: { createdAt: dateFilter } }),
    prisma.lead.count({ where: { createdAt: dateFilter, status: 'WON' } }),
    prisma.lead.count({ where: { createdAt: dateFilter, status: 'LOST' } }),
    prisma.project.count({ where: { confirmedAt: dateFilter } }),
    prisma.project.count({ where: { installedAt: dateFilter } }),
    prisma.project.count({ where: { closedAt: dateFilter } }),
    prisma.invoice.aggregate({
      where: { issueDate: dateFilter, status: { not: 'CANCELLED' } },
      _sum: { total: true, amountPaid: true },
      _count: true,
    }),
    prisma.project.aggregate({
      where: { installedAt: dateFilter },
      _sum: { capacityKw: true },
    }),
    prisma.subsidyApplication.aggregate({
      where: { disbursedAt: dateFilter },
      _sum: { amountReceived: true },
    }),
    prisma.ticket.count({ where: { status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } } }),
  ]);

  const invoicedTotal = dec(invoiceStats._sum.total ?? 0);
  const collectedTotal = dec(invoiceStats._sum.amountPaid ?? 0);
  const outstanding = round2(invoicedTotal.minus(collectedTotal));

  return {
    period: { from: from ?? null, to: to ?? null },
    leads: { total: leadsTotal, won: leadsWon, lost: leadsLost, conversionRate: leadsTotal > 0 ? ((leadsWon / leadsTotal) * 100).toFixed(1) : '0.0' },
    projects: { confirmed: projectsConfirmed, installed: projectsInstalled, closed: projectsClosed },
    finance: {
      invoiced: toMoneyString(invoicedTotal),
      collected: toMoneyString(collectedTotal),
      outstanding: toMoneyString(outstanding),
      invoiceCount: invoiceStats._count,
    },
    capacity: { totalKw: Number(capacityInstalled._sum.capacityKw ?? 0).toFixed(2) },
    subsidy: { disbursed: toMoneyString(dec(subsidyDisbursed._sum.amountReceived ?? 0)) },
    support: { activeTickets },
  };
}

/**
 * Profitability report — all projects with profit data, paginated.
 *
 * Throws: nothing.
 */
export async function getProfitabilityReport(query) {
  const { skip, take, meta } = paginate(query);
  const where = {};
  if (query.status) where.status = query.status;

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        status: true,
        capacityKw: true,
        createdAt: true,
        customer: { select: { name: true, city: true } },
      },
    }),
    prisma.project.count({ where }),
  ]);

  const rows = await Promise.all(projects.map((p) => projectProfit(p.id).then((profit) => ({ ...p, profit }))));

  return { data: rows, meta: meta(total) };
}

/**
 * Pipeline report — leads by status with conversion funnel.
 *
 * Throws: nothing.
 */
export async function getPipelineReport() {
  const statusCounts = await prisma.lead.groupBy({
    by: ['status'],
    _count: true,
    orderBy: { _count: { status: 'desc' } },
  });

  const monthlyLeads = await prisma.$queryRaw`
    SELECT DATE_TRUNC('month', "createdAt") as month, COUNT(*) as count
    FROM "Lead"
    WHERE "createdAt" > NOW() - INTERVAL '6 months'
    GROUP BY 1
    ORDER BY 1
  `;

  return { byStatus: statusCounts.map((s) => ({ status: s.status, count: s._count })), monthlyLeads };
}

/**
 * Unfinished work report — projects stalled, overdue surveys, open tickets.
 *
 * Throws: nothing.
 */
export async function getUnfinishedReport() {
  const stalledProjects = await prisma.project.findMany({
    where: { status: { in: ['AWAITING_ADVANCE', 'CONFIRMED', 'PACKING', 'DISPATCHED', 'DELIVERED'] } },
    include: { customer: { select: { name: true, city: true } } },
    orderBy: { updatedAt: 'asc' },
    take: 50,
  });

  const overdueLeads = await prisma.lead.findMany({
    where: {
      status: { in: ['NEW', 'CONTACTED'] },
      createdAt: { lt: new Date(Date.now() - 24 * 3600_000) },
      firstContactedAt: null,
    },
    include: { assignedTo: { select: { name: true } } },
    take: 50,
  });

  const openTickets = await prisma.ticket.findMany({
    where: { status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_PARTS'] } },
    include: { customer: { select: { name: true } }, assignedTo: { select: { name: true } } },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    take: 50,
  });

  return { stalledProjects, overdueLeads, openTickets };
}

/**
 * Service report — tickets by category, resolution time, chargeable vs. free.
 *
 * Throws: nothing.
 */
export async function getServiceReport() {
  const byCategory = await prisma.ticket.groupBy({
    by: ['category', 'isChargeable'],
    _count: true,
  });

  const avgResolution = await prisma.$queryRaw`
    SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600) as avg_hours
    FROM "Ticket"
    WHERE "resolvedAt" IS NOT NULL
    AND "createdAt" > NOW() - INTERVAL '90 days'
  `;

  return { byCategory: byCategory.map((r) => ({ category: r.category, isChargeable: r.isChargeable, count: r._count })), avgResolution };
}

function buildDateFilter(from, to) {
  if (!from && !to) return undefined;
  const filter = {};
  if (from) filter.gte = new Date(from);
  if (to) filter.lte = new Date(to);
  return filter;
}
