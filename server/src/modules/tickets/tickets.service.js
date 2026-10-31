import { prisma } from '../../core/prisma.js';
import { AppError } from '../../core/AppError.js';
import { nextCode } from '../../core/codes.js';
import { paginate } from '../../core/pagination.js';
import { emitEvent } from '../../core/events.js';
import { notifyUsers, notifyRole } from '../../core/notify.js';

const TICKET_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true, city: true } },
  project: { select: { id: true, code: true } },
  serialUnit: { select: { id: true, serialNumber: true, productId: true, product: { select: { name: true, category: true } } } },
  assignedTo: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  activities: {
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  },
  parts: {
    include: {
      product: { select: { id: true, sku: true, name: true } },
      oldSerial: { select: { id: true, serialNumber: true } },
      newSerial: { select: { id: true, serialNumber: true } },
    },
  },
};

/**
 * Lists tickets with optional filters.
 * Why: support dashboard shows all open tickets; technician sees assigned ones.
 * Flow: filter by role, paginate.
 * Example: await listTickets({ status: 'OPEN', priority: 'HIGH' }, user)
 * Throws: nothing.
 */
export async function listTickets(query, user) {
  const { skip, take, meta } = paginate(query);
  const where = {};
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.category) where.category = query.category;
  if (query.customerId) where.customerId = query.customerId;
  if (query.projectId) where.projectId = query.projectId;

  if (user.role === 'INSTALLATION_TECHNICIAN') {
    where.assignedToId = user.id;
  } else if (user.role === 'CUSTOMER') {
    const customer = await prisma.customer.findFirst({ where: { userId: user.id } });
    if (!customer) return { rows: [], meta: { page: 1, pageSize: 20, total: 0 } };
    where.customerId = customer.id;
  }

  const [rows, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      where, skip, take, orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        project: { select: { id: true, code: true } },
        serialUnit: { select: { id: true, serialNumber: true } },
        assignedTo: { select: { id: true, name: true } },
        _count: { select: { activities: true, parts: true } },
      },
    }),
    prisma.ticket.count({ where }),
  ]);
  return { rows, meta: meta(total) };
}

/**
 * Gets one ticket by id with full detail.
 * Why: ticket detail view shows all activities, parts, and status.
 * Flow: findUnique with full include.
 * Example: await getTicket("tkt_123")
 * Throws: AppError 404.
 */
export async function getTicket(id) {
  const ticket = await prisma.ticket.findUnique({ where: { id }, include: TICKET_INCLUDE });
  if (!ticket) throw new AppError('Ticket not found', 404, 'NOT_FOUND');
  return ticket;
}

/**
 * Creates a service ticket (BR-11).
 * Why: support raises a ticket after identifying the customer and serial unit.
 * Flow: resolve warranty status (isUnderWarranty frozen at creation), nextCode, create.
 * Example: await createTicket({ customerId, serialUnitId, category, ... }, userId)
 * Throws: AppError 404.
 */
export async function createTicket(data, userId) {
  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');

  // Resolve warranty status at ticket creation time (frozen — BR-11)
  let isUnderWarranty = null;
  if (data.serialUnitId) {
    const warranty = await prisma.warranty.findFirst({ where: { serialUnitId: data.serialUnitId } });
    if (warranty) {
      isUnderWarranty = !warranty.voidReason && new Date() <= new Date(warranty.endDate);
    } else {
      isUnderWarranty = false;
    }
  }

  return prisma.$transaction(async (tx) => {
    const number = await nextCode(tx, 'TKT');
    const ticket = await tx.ticket.create({
      data: {
        number,
        customerId: data.customerId,
        projectId: data.projectId || null,
        serialUnitId: data.serialUnitId || null,
        source: data.source,
        category: data.category,
        faultCode: data.faultCode || null,
        description: data.description,
        priority: data.priority || 'MEDIUM',
        isUnderWarranty,
        isChargeable: isUnderWarranty === true ? false : null,
        createdById: userId,
      },
      include: TICKET_INCLUDE,
    });

    // Activity
    await tx.ticketActivity.create({
      data: {
        ticketId: ticket.id,
        userId,
        type: 'NOTE',
        message: `Ticket raised via ${data.source.toLowerCase().replace('_', ' ')}`,
      },
    });

    return ticket;
  });
}

/**
 * Assigns a ticket to a technician.
 * Why: support executive dispatches the right person.
 * Flow: find ticket, update assignedToId, add activity, notify.
 * Example: await assignTicket("tkt_123", "user_456", userId)
 * Throws: AppError 404.
 */
export async function assignTicket(id, technicianId, userId) {
  await getTicket(id);
  const tech = await prisma.user.findUnique({ where: { id: technicianId } });
  if (!tech) throw new AppError('Technician not found', 404, 'NOT_FOUND');

  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.update({
      where: { id },
      data: { assignedToId: technicianId, status: 'ASSIGNED' },
      include: TICKET_INCLUDE,
    });
    await tx.ticketActivity.create({
      data: { ticketId: id, userId, type: 'STATUS_CHANGE', message: `Assigned to ${tech.name}` },
    });
    await notifyUsers([technicianId], 'TICKET', `Ticket ${ticket.number} assigned to you`, `/tickets/${id}`);
    return ticket;
  });
}

/**
 * Updates ticket status.
 * Why: technician moves ticket through the workflow.
 * Flow: validate transition, update, add activity.
 * Example: await updateTicketStatus("tkt_123", "IN_PROGRESS", userId)
 * Throws: AppError 422 on invalid transition.
 */
export async function updateTicketStatus(id, status, note, userId) {
  const ticket = await getTicket(id);
  const terminal = ['CLOSED'];
  if (terminal.includes(ticket.status)) {
    throw new AppError(`Cannot update a ${ticket.status} ticket`, 422, 'INVALID_STATUS');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.ticket.update({
      where: { id },
      data: { status },
      include: TICKET_INCLUDE,
    });
    await tx.ticketActivity.create({
      data: { ticketId: id, userId, type: 'STATUS_CHANGE', message: note || `Status changed to ${status}` },
    });
    return updated;
  });
}

/**
 * Resolves a ticket with a resolution note.
 * Why: technician marks work done; customer confirmation step follows (BR-12).
 * Flow: update status → RESOLVED, set resolutionNote, notify customer.
 * Example: await resolveTicket("tkt_123", "Replaced faulty inverter board", userId)
 * Throws: AppError 422.
 */
export async function resolveTicket(id, resolutionNote, userId) {
  const ticket = await getTicket(id);
  if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
    throw new AppError('Ticket is already resolved or closed', 422, 'INVALID_STATUS');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.ticket.update({
      where: { id },
      data: { status: 'RESOLVED', resolutionNote, resolvedAt: new Date() },
      include: TICKET_INCLUDE,
    });
    await tx.ticketActivity.create({
      data: { ticketId: id, userId, type: 'STATUS_CHANGE', message: `Resolved: ${resolutionNote}` },
    });
    // Notify customer for confirmation (BR-12)
    if (ticket.customer?.userId) {
      await notifyUsers([ticket.customer.userId], 'TICKET', `Ticket ${ticket.number} resolved — please confirm`, `/portal/tickets/${id}`);
    }
    return updated;
  });
}

/**
 * Customer confirms ticket resolution (BR-12).
 * Why: a ticket closes only after the customer confirms.
 * Flow: verify RESOLVED, set customerConfirmedAt + status → CLOSED.
 * Example: await confirmTicket("tkt_123", "All good", customerId)
 * Throws: AppError 422, 403.
 */
export async function confirmTicket(id, confirmationNote, user) {
  const ticket = await getTicket(id);
  if (ticket.status !== 'RESOLVED') {
    throw new AppError('Ticket must be RESOLVED before customer can confirm', 422, 'INVALID_STATUS');
  }

  // Verify ownership for customers
  if (user.role === 'CUSTOMER') {
    const customer = await prisma.customer.findFirst({ where: { userId: user.id } });
    if (!customer || ticket.customerId !== customer.id) {
      throw new AppError('You are not the customer for this ticket', 403, 'FORBIDDEN');
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.ticket.update({
      where: { id },
      data: {
        status: 'CLOSED',
        customerConfirmedAt: new Date(),
        confirmationNote,
      },
      include: TICKET_INCLUDE,
    });
    await tx.ticketActivity.create({
      data: { ticketId: id, userId: user.id, type: 'STATUS_CHANGE', message: `Customer confirmed. ${confirmationNote || ''}`.trim() },
    });
    emitEvent('ticket.closed', { ticketId: id });
    return updated;
  });
}

/**
 * Adds an activity (call log, note, visit) to a ticket.
 * Why: creates a timeline of support interactions.
 * Flow: create activity row.
 * Example: await addActivity("tkt_123", { type: 'CALL', message: 'Called customer, described fault' }, userId)
 * Throws: AppError 404.
 */
export async function addActivity(ticketId, data, userId) {
  await getTicket(ticketId);
  return prisma.ticketActivity.create({
    data: { ticketId, userId, type: data.type, message: data.message },
    include: { user: { select: { id: true, name: true } } },
  });
}

/**
 * Adds a part used on a ticket (for service billing and warranty cost).
 * Why: TicketPart stores both unitPrice (billed) and unitCost (our cost) for BR-11/BR-13.
 * Flow: create part row.
 * Example: await addPart("tkt_123", { productId, quantity, unitPrice, unitCost })
 * Throws: AppError 404.
 */
export async function addPart(ticketId, data) {
  await getTicket(ticketId);
  return prisma.ticketPart.create({
    data: {
      ticketId,
      productId: data.productId,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      unitCost: data.unitCost,
      oldSerialId: data.oldSerialId || null,
      newSerialId: data.newSerialId || null,
      labourHours: data.labourHours || null,
    },
    include: {
      product: { select: { id: true, sku: true, name: true } },
    },
  });
}
