import { prisma } from '../../core/prisma.js';
import { AppError } from '../../core/AppError.js';

/**
 * Universal lookup: find a customer by phone, name, serial number, or project code.
 * Why: support executive must identify the caller in seconds (US-E1).
 * Flow: parallel queries on Customer, SerialUnit, Project; merge and deduplicate.
 * Example: await supportLookup('9876543210')
 * Throws: nothing.
 */
export async function supportLookup(q) {
  if (!q || q.trim().length < 2) return [];

  const term = q.trim();

  const [customers, serials, projects] = await Promise.all([
    prisma.customer.findMany({
      where: {
        OR: [
          { phone: { contains: term } },
          { name: { contains: term, mode: 'insensitive' } },
          { altPhone: { contains: term } },
        ],
      },
      select: {
        id: true, name: true, phone: true, city: true, customerType: true,
        projects: { select: { id: true, code: true, status: true }, take: 3 },
        warranties: { where: { voidReason: null, endDate: { gte: new Date() } }, select: { id: true }, take: 1 },
      },
      take: 10,
    }),
    prisma.serialUnit.findMany({
      where: { serialNumber: { contains: term, mode: 'insensitive' } },
      select: {
        id: true, serialNumber: true, status: true,
        product: { select: { id: true, name: true, category: true } },
        project: { select: { id: true, code: true, customer: { select: { id: true, name: true, phone: true } } } },
        warranty: { select: { id: true, endDate: true, voidReason: true } },
      },
      take: 5,
    }),
    prisma.project.findMany({
      where: { code: { contains: term, mode: 'insensitive' } },
      select: {
        id: true, code: true, status: true,
        customer: { select: { id: true, name: true, phone: true } },
      },
      take: 5,
    }),
  ]);

  const results = [];

  for (const c of customers) {
    results.push({
      type: 'customer',
      id: c.id,
      label: c.name,
      sub: c.phone + (c.city ? ` · ${c.city}` : ''),
      link: `/support/customers/${c.id}`,
      hasActiveWarranty: c.warranties.length > 0,
      projectCount: c.projects.length,
    });
  }
  for (const s of serials) {
    results.push({
      type: 'serial',
      id: s.id,
      label: s.serialNumber,
      sub: s.product.name + (s.project?.customer?.name ? ` · ${s.project.customer.name}` : ''),
      link: `/support/serials/${s.serialNumber}`,
      warrantyActive: s.warranty && !s.warranty.voidReason && new Date() <= new Date(s.warranty.endDate),
    });
  }
  for (const p of projects) {
    results.push({
      type: 'project',
      id: p.id,
      label: p.code,
      sub: p.customer?.name ?? '',
      link: `/support/projects/${p.id}`,
    });
  }

  return results;
}

/**
 * Full customer 360: all projects, warranties, and tickets.
 * Why: support needs one page with everything about the customer.
 * Flow: load customer with all nested data, derive warranty statuses.
 * Example: await getCustomer360('cust_123')
 * Throws: AppError 404.
 */
export async function getCustomer360(customerId) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      projects: {
        orderBy: { createdAt: 'desc' },
        include: {
          warranties: {
            include: { serialUnit: { include: { product: { select: { name: true, category: true } } } } },
          },
          tickets: {
            where: { status: { not: 'CLOSED' } },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      },
      tickets: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          project: { select: { id: true, code: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');

  // Derive warranty statuses
  const now = new Date();
  for (const project of customer.projects) {
    for (const w of project.warranties) {
      w.status = w.voidReason ? 'VOID' : now > new Date(w.endDate) ? 'EXPIRED' : 'ACTIVE';
    }
  }

  return customer;
}

/**
 * Warranty check by serial number.
 * Why: quick warranty validation during a support call.
 * Flow: load serial + warranty, derive status.
 * Example: await checkWarranty('PANEL-2026-001')
 * Throws: AppError 404.
 */
export async function checkWarranty(serialNumber) {
  const serial = await prisma.serialUnit.findUnique({
    where: { serialNumber },
    include: {
      product: { select: { id: true, sku: true, name: true, category: true, warrantyMonths: true } },
      warranty: {
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          project: { select: { id: true, code: true } },
        },
      },
    },
  });
  if (!serial) throw new AppError(`Serial number ${serialNumber} not found`, 404, 'NOT_FOUND');

  const w = serial.warranty;
  const warrantyStatus = w
    ? w.voidReason ? 'VOID' : new Date() > new Date(w.endDate) ? 'EXPIRED' : 'ACTIVE'
    : 'NO_WARRANTY';

  return { serial, warranty: w, warrantyStatus };
}

/**
 * Support dashboard stats.
 * Why: support executive needs a quick view of open ticket queue.
 * Flow: count tickets by status and priority.
 * Example: await getSupportDashboard()
 * Throws: nothing.
 */
export async function getSupportDashboard() {
  const [open, inProgress, awaitingParts, resolved, byPriority] = await prisma.$transaction([
    prisma.ticket.count({ where: { status: 'OPEN' } }),
    prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.ticket.count({ where: { status: 'AWAITING_PARTS' } }),
    prisma.ticket.count({ where: { status: 'RESOLVED' } }),
    prisma.ticket.groupBy({ by: ['priority'], where: { status: { notIn: ['CLOSED', 'RESOLVED'] } }, _count: true }),
  ]);

  return {
    open, inProgress, awaitingParts, resolved,
    byPriority: byPriority.map(r => ({ priority: r.priority, count: r._count })),
  };
}
