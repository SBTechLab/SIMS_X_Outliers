import { prisma } from '../../core/prisma.js';
import { AppError } from '../../core/AppError.js';
import { emitEvent } from '../../core/events.js';
import { nextCode } from '../../core/codes.js';
import { paginate } from '../../core/pagination.js';

const LEAD_LIST_SELECT = {
  id: true,
  code: true,
  name: true,
  phone: true,
  city: true,
  source: true,
  requestedSystemType: true,
  requestedCapacityKw: true,
  wantsSubsidy: true,
  status: true,
  firstContactedAt: true,
  duplicateOfId: true,
  createdAt: true,
  assignedTo: { select: { id: true, name: true } },
  duplicateOf: { select: { code: true } },
};

function isOverdue(lead) {
  if (lead.firstContactedAt) return false;
  const ageMs = Date.now() - new Date(lead.createdAt).getTime();
  return ageMs > 24 * 60 * 60 * 1000;
}

/**
 * Lists leads with optional filters and pagination.
 *
 * Why: sales inbox — every enquiry stays visible forever (BR-01).
 * Flow: build where clause, include overdue filter via date comparison, paginate.
 * Example:
 *   await listLeads({ status: 'NEW', overdue: true, page: 1, pageSize: 20 }, actor)
 * Throws: nothing.
 */
export async function listLeads(query) {
  const { skip, take, meta } = paginate(query);
  const where = {};

  if (query.status) where.status = query.status;
  if (query.source) where.source = query.source;
  if (query.assignedTo) where.assignedToId = query.assignedTo;
  if (query.overdue) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    where.firstContactedAt = null;
    where.createdAt = { lt: cutoff };
    where.status = { notIn: ['LOST'] };
  }
  if (query.q) {
    where.OR = [
      { code: { contains: query.q, mode: 'insensitive' } },
      { name: { contains: query.q, mode: 'insensitive' } },
      { phone: { contains: query.q } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.lead.findMany({ where, select: LEAD_LIST_SELECT, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.lead.count({ where }),
  ]);

  return {
    leads: rows.map((l) => ({
      ...l,
      requestedCapacityKw: l.requestedCapacityKw ? Number(l.requestedCapacityKw) : null,
      isOverdue: isOverdue(l),
      isDuplicate: !!l.duplicateOfId,
      duplicateOfCode: l.duplicateOf?.code ?? null,
    })),
    meta: meta(total),
  };
}

/**
 * Creates a lead manually (phone call, walk-in, etc.).
 *
 * Why: BR-01 — all channels flow into one lead table; duplicates are flagged not rejected.
 * Flow: duplicate phone check → round-robin assign → nextCode → create.
 * Example:
 *   await createLead({ name: 'Raj', phone: '9701234567', source: 'PHONE_CALL' }, actor)
 * Throws: nothing extra — AppError from validation.
 */
export async function createLead(data, actor) {
  const lead = await prisma.$transaction(async (tx) => {
    const original = await tx.lead.findFirst({
      where: { phone: data.phone }, orderBy: { createdAt: 'asc' }, select: { id: true },
    });

    let assignedToId = data.assignedToId ?? null;
    if (!assignedToId) {
      const execs = await tx.user.findMany({ where: { role: 'SALES_EXECUTIVE', isActive: true }, select: { id: true } });
      if (execs.length > 0) {
        const counts = await tx.lead.groupBy({
          by: ['assignedToId'],
          where: { assignedToId: { in: execs.map((e) => e.id) }, status: { not: 'LOST' } },
          _count: { id: true },
        });
        const tally = new Map(execs.map((e) => [e.id, 0]));
        for (const r of counts) if (r.assignedToId) tally.set(r.assignedToId, r._count.id);
        let min = Infinity; let chosen = execs[0].id;
        for (const [id, c] of tally) if (c < min) { min = c; chosen = id; }
        assignedToId = chosen;
      }
    }

    const code = await nextCode('ENQ', tx);
    return tx.lead.create({
      data: {
        code,
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        pincode: data.pincode ?? null,
        source: data.source,
        requestedSystemType: data.requestedSystemType ?? 'NOT_SURE',
        requestedCapacityKw: data.requestedCapacityKw != null ? String(data.requestedCapacityKw) : null,
        wantsSubsidy: data.wantsSubsidy ?? false,
        status: 'NEW',
        assignedToId,
        duplicateOfId: original?.id ?? null,
      },
      select: { id: true, code: true },
    });
  });

  emitEvent('lead.created', { leadId: lead.id });
  return lead;
}

/**
 * Returns a single lead with full detail (activities, surveys, quotes, duplicates).
 *
 * Why: sales executive reads the timeline before calling.
 * Flow: load lead by id, include all relations.
 * Example:
 *   await getLead('cuid123', actor)
 * Throws: AppError 404 NOT_FOUND.
 */
export async function getLead(id) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true } },
      activities: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, name: true } } },
      },
      surveys: { select: { id: true, status: true, scheduledAt: true, submittedAt: true, technician: { select: { id: true, name: true } } } },
      quotes: { select: { id: true, number: true, status: true, total: true, createdAt: true } },
      duplicateOf: { select: { id: true, code: true, status: true } },
      linkedDuplicates: { select: { id: true, code: true, status: true, createdAt: true } },
    },
  });

  if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead not found.');

  return {
    ...lead,
    requestedCapacityKw: lead.requestedCapacityKw ? Number(lead.requestedCapacityKw) : null,
    monthlyBillInr: lead.monthlyBillInr ? lead.monthlyBillInr.toString() : null,
    quotes: lead.quotes.map((q) => ({ ...q, total: q.total.toString() })),
    isOverdue: isOverdue(lead),
    isDuplicate: !!lead.duplicateOfId,
  };
}

/**
 * Updates editable fields on a lead.
 *
 * Why: contact details may change; BR-01 — no deletion, status changed only via action endpoints.
 * Flow: validate exists, update editable fields only (status NOT included).
 * Example:
 *   await updateLead('cuid123', { city: 'Secunderabad' }, actor)
 * Throws: AppError 404 NOT_FOUND.
 */
export async function updateLead(id, data) {
  const lead = await prisma.lead.findUnique({ where: { id }, select: { id: true } });
  if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead not found.');

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.pincode !== undefined && { pincode: data.pincode }),
      ...(data.requestedSystemType !== undefined && { requestedSystemType: data.requestedSystemType }),
      ...(data.requestedCapacityKw !== undefined && { requestedCapacityKw: String(data.requestedCapacityKw) }),
      ...(data.wantsSubsidy !== undefined && { wantsSubsidy: data.wantsSubsidy }),
    },
    select: { id: true, code: true, status: true, name: true, phone: true, city: true, updatedAt: true },
  });

  return updated;
}

/**
 * Adds an activity note/call/visit to a lead.
 *
 * Why: first contact sets BR-02 clock; moves NEW → CONTACTED.
 * Flow: create activity, update firstContactedAt if first CALL/WHATSAPP/VISIT, advance status.
 * Example:
 *   await addActivity('cuid123', { type: 'CALL', message: 'Interested, asked for quote' }, actor)
 * Throws: AppError 404 NOT_FOUND.
 */
export async function addActivity(leadId, data, actor) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, status: true, firstContactedAt: true },
  });
  if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead not found.');

  const isContact = ['CALL', 'WHATSAPP', 'VISIT'].includes(data.type);
  const leadUpdates = {};
  if (isContact && !lead.firstContactedAt) {
    leadUpdates.firstContactedAt = new Date();
  }
  if (lead.status === 'NEW' && isContact) {
    leadUpdates.status = 'CONTACTED';
  }

  const [activity] = await prisma.$transaction([
    prisma.leadActivity.create({
      data: { leadId, userId: actor.id, type: data.type, message: data.message },
      include: { user: { select: { id: true, name: true } } },
    }),
    ...(Object.keys(leadUpdates).length > 0
      ? [prisma.lead.update({ where: { id: leadId }, data: leadUpdates })]
      : []),
  ]);

  return activity;
}

/**
 * Qualifies or disqualifies a lead.
 *
 * Why: gate before scheduling a survey (BR-03 survey requires QUALIFIED lead).
 * Flow: verify status is NEW or CONTACTED, update qualification fields, advance status.
 * Example:
 *   await qualifyLead('cuid123', { qualified: true, roofAreaSqft: 200, gridConnectionOk: true }, actor)
 * Throws: AppError 404 NOT_FOUND, 409 INVALID_TRANSITION.
 */
export async function qualifyLead(id, data) {
  const lead = await prisma.lead.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead not found.');
  if (!['NEW', 'CONTACTED'].includes(lead.status)) {
    throw new AppError(409, 'INVALID_TRANSITION', `Cannot qualify a lead in status ${lead.status}.`);
  }

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      status: data.qualified ? 'QUALIFIED' : 'NOT_QUALIFIED',
      roofAreaSqft: data.roofAreaSqft ?? null,
      monthlyBillInr: data.monthlyBillInr != null ? String(data.monthlyBillInr) : null,
      gridConnectionOk: data.gridConnectionOk ?? null,
      sanctionedLoadKw: data.sanctionedLoadKw != null ? String(data.sanctionedLoadKw) : null,
      qualificationNotes: data.qualificationNotes ?? null,
    },
    select: { id: true, code: true, status: true, qualificationNotes: true },
  });

  return updated;
}

/**
 * Re-assigns a lead to a different sales executive.
 *
 * Why: workload rebalancing by a director or peer transfer.
 * Flow: verify assignee is a SALES_EXECUTIVE, update, notify new assignee.
 * Example:
 *   await assignLead('cuid123', { assignedToId: 'exec456' }, actor)
 * Throws: AppError 404 NOT_FOUND, 422 INVALID_ASSIGNEE.
 */
export async function assignLead(id, data) {
  const lead = await prisma.lead.findUnique({ where: { id }, select: { id: true, code: true, name: true } });
  if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead not found.');

  const assignee = await prisma.user.findUnique({ where: { id: data.assignedToId }, select: { id: true, role: true } });
  if (!assignee || assignee.role !== 'SALES_EXECUTIVE') {
    throw new AppError(422, 'INVALID_ASSIGNEE', 'Assignee must be an active SALES_EXECUTIVE.');
  }

  const updated = await prisma.lead.update({
    where: { id },
    data: { assignedToId: data.assignedToId },
    select: { id: true, code: true, assignedTo: { select: { id: true, name: true } } },
  });

  emitEvent('lead.assigned', { leadId: id, assignedToId: data.assignedToId, code: lead.code, name: lead.name });
  return updated;
}

/**
 * Marks a lead as lost.
 *
 * Why: removes from active pipeline; WON leads cannot be lost.
 * Flow: verify not WON, update status and reason.
 * Example:
 *   await markLeadLost('cuid123', { lostReason: 'Budget constraint' }, actor)
 * Throws: AppError 404 NOT_FOUND, 409 INVALID_TRANSITION.
 */
export async function markLeadLost(id, data) {
  const lead = await prisma.lead.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead not found.');
  if (lead.status === 'WON') {
    throw new AppError(409, 'INVALID_TRANSITION', 'A WON lead cannot be marked as lost.');
  }

  const updated = await prisma.lead.update({
    where: { id },
    data: { status: 'LOST', lostReason: data.lostReason },
    select: { id: true, code: true, status: true, lostReason: true },
  });

  return updated;
}
