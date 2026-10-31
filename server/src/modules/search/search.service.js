import { prisma } from '../../core/prisma.js';

/**
 * Global search — returns results from multiple entities, scoped by role.
 *
 * Why: staff need to find a customer, serial, project, lead or ticket from a single search
 *      box. Scoping by role means a WAREHOUSE_MANAGER never sees leads.
 * Flow: run parallel queries for entity types the role can see, merge, return top 5 per type.
 * Example:
 *   await globalSearch("PRJ-2026", user)
 *   // → { customers: [], projects: [{ code: "PRJ-2026-0001", ... }], leads: [], ... }
 * Throws: nothing.
 */
export async function globalSearch(q, actor) {
  if (!q || q.trim().length < 2) return emptyResult();

  const term = q.trim();
  const role = actor.role;

  const [customers, projects, leads, serials, tickets] = await Promise.all([
    canSeeCustomers(role) ? searchCustomers(term) : [],
    canSeeProjects(role) ? searchProjects(term, actor) : [],
    canSeeLeads(role) ? searchLeads(term, actor) : [],
    canSeeSerials(role) ? searchSerials(term) : [],
    canSeeTickets(role) ? searchTickets(term, actor) : [],
  ]);

  return { customers, projects, leads, serials, tickets };
}

function canSeeCustomers(role) {
  return ['SUPER_ADMIN', 'DIRECTOR', 'SALES_EXECUTIVE', 'SUPPORT_EXECUTIVE', 'WAREHOUSE_MANAGER'].includes(role);
}

function canSeeProjects(role) {
  return ['SUPER_ADMIN', 'DIRECTOR', 'SALES_EXECUTIVE', 'WAREHOUSE_MANAGER', 'INSTALLATION_TECHNICIAN'].includes(role);
}

function canSeeLeads(role) {
  return ['SUPER_ADMIN', 'DIRECTOR', 'SALES_EXECUTIVE'].includes(role);
}

function canSeeSerials(role) {
  return ['SUPER_ADMIN', 'DIRECTOR', 'WAREHOUSE_MANAGER', 'INSTALLATION_TECHNICIAN', 'SUPPORT_EXECUTIVE'].includes(role);
}

function canSeeTickets(role) {
  return ['SUPER_ADMIN', 'DIRECTOR', 'SUPPORT_EXECUTIVE', 'SALES_EXECUTIVE'].includes(role);
}

async function searchCustomers(term) {
  return prisma.customer.findMany({
    where: {
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term } },
        { email: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
      ],
    },
    take: 5,
    select: { id: true, name: true, phone: true, city: true },
  }).then((rows) => rows.map((r) => ({ type: 'customer', id: r.id, label: r.name, sub: r.phone ?? r.city, link: `/sales/customers/${r.id}` })));
}

async function searchProjects(term, actor) {
  const where = {
    OR: [
      { code: { contains: term, mode: 'insensitive' } },
      { customer: { name: { contains: term, mode: 'insensitive' } } },
    ],
  };
  if (actor.role === 'INSTALLATION_TECHNICIAN') {
    where.installations = { some: { crew: { some: { technicianId: actor.id } } } };
  }
  return prisma.project.findMany({
    where,
    take: 5,
    select: { id: true, code: true, status: true, customer: { select: { name: true } } },
  }).then((rows) => rows.map((r) => ({ type: 'project', id: r.id, label: r.code, sub: r.customer?.name ?? '', link: `/sales/projects/${r.id}` })));
}

async function searchLeads(term, actor) {
  const where = {
    OR: [
      { code: { contains: term, mode: 'insensitive' } },
      { name: { contains: term, mode: 'insensitive' } },
      { phone: { contains: term } },
    ],
  };
  if (actor.role === 'SALES_EXECUTIVE') where.assignedToId = actor.id;

  return prisma.lead.findMany({
    where,
    take: 5,
    select: { id: true, code: true, name: true, phone: true, status: true },
  }).then((rows) => rows.map((r) => ({ type: 'lead', id: r.id, label: r.code, sub: `${r.name} · ${r.phone}`, link: `/sales/leads/${r.id}` })));
}

async function searchSerials(term) {
  return prisma.serialUnit.findMany({
    where: { serialNumber: { contains: term, mode: 'insensitive' } },
    take: 5,
    include: { product: { select: { name: true } } },
  }).then((rows) => rows.map((r) => ({ type: 'serial', id: r.id, label: r.serialNumber, sub: r.product?.name ?? '', link: `/warehouse/serials/${r.serialNumber}` })));
}

async function searchTickets(term, actor) {
  const where = {
    OR: [
      { number: { contains: term, mode: 'insensitive' } },
      { customer: { name: { contains: term, mode: 'insensitive' } } },
    ],
  };
  if (actor.role === 'SUPPORT_EXECUTIVE') where.assignedToId = actor.id;

  return prisma.ticket.findMany({
    where,
    take: 5,
    select: { id: true, number: true, category: true, status: true, customer: { select: { name: true } } },
  }).then((rows) => rows.map((r) => ({ type: 'ticket', id: r.id, label: r.number, sub: r.customer?.name ?? '', link: `/support/tickets/${r.id}` })));
}

function emptyResult() {
  return { customers: [], projects: [], leads: [], serials: [], tickets: [] };
}
