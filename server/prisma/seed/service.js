import { addMonths, daysFromNow, minutesBetween, money } from './helpers.js';
import { nextSeedCode } from './funnel.js';

/**
 * Tickets, payouts, notifications and audit rows.
 *
 * The two tickets that matter are the warranty branches of BR-11: one on the 18-month-old
 * system (free, cost booked as a warranty expense) and one on the 27-month-old system
 * (chargeable, with a SERVICE invoice generated from parts plus labour plus the visit charge).
 */

/** Finds a delivered serial of a category on a project, with its warranty. */
async function findUnit(prisma, projectId, category) {
  return prisma.serialUnit.findFirst({
    where: { projectId, product: { category } },
    include: { product: true, warranty: true },
  });
}

/**
 * The free, in-warranty ticket — the "rainy season breakdown" from the problem statement.
 *
 * Why: this is the demo's proof that BR-11 works. The ticket is on Vipul Mehta's inverter,
 *      18 months after delivery, so the warranty is still ACTIVE and the customer pays
 *      nothing. The cost lands as a project expense instead, which keeps BR-13 honest.
 */
async function warrantyTicket(prisma, ctx, project, customer) {
  const inverter = await findUnit(prisma, project.id, 'INVERTER');
  const dcBox = await prisma.product.findUnique({ where: { sku: 'DCB-STD-2IN' } });

  const createdAt = daysFromNow(-9, 14, 20);

  const ticket = await prisma.ticket.create({
    data: {
      number: nextSeedCode('TKT'),
      customerId: customer.id,
      projectId: project.id,
      serialUnitId: inverter.id,
      source: 'PHONE',
      category: 'INVERTER_FAULT',
      faultCode: 'E-04',
      description:
        'Heavy rain since morning. Inverter display shows E-04 and there is no output. Customer called at 2 pm.',
      priority: 'HIGH',
      status: 'CLOSED',
      // Resolved from the warranty at creation and then frozen (BR-11).
      isUnderWarranty: true,
      isChargeable: false,
      assignedToId: ctx.staff.install3.id,
      createdById: ctx.staff.support.id,
      resolutionNote:
        'DC isolator terminal had water ingress and was arcing. Replaced the DC distribution box, dried and re-torqued the terminals. Generation back to 2.6 kW at noon.',
      resolvedAt: daysFromNow(-8, 12, 30),
      customerConfirmedAt: daysFromNow(-8, 18, 5),
      confirmationNote: null,
      createdAt,
      activities: {
        create: [
          { userId: ctx.staff.support.id, type: 'CALL', message: 'Customer reports E-04 and zero generation. Warranty active until ' + addMonths(inverter.warranty.startDate, inverter.product.warrantyMonths).toDateString() + '. No charge.', createdAt },
          { userId: ctx.staff.support.id, type: 'STATUS_CHANGE', message: 'Assigned to Arvind Makwana for a site visit tomorrow morning.', createdAt: daysFromNow(-9, 15, 0) },
          { userId: ctx.staff.install3.id, type: 'VISIT', message: 'On site. Water ingress in the DC box, terminal arcing. Replacing the box.', createdAt: daysFromNow(-8, 10, 15) },
          { userId: ctx.staff.install3.id, type: 'NOTE', message: 'Generation verified at 2.6 kW. Advised the customer on sealing the conduit entry.', createdAt: daysFromNow(-8, 12, 25) },
        ],
      },
    },
  });

  // Both prices are stored: unitPrice is what a chargeable ticket would bill, unitCost is
  // what this free repair actually cost us (BR-11, BR-13).
  await prisma.ticketPart.create({
    data: {
      ticketId: ticket.id,
      productId: dcBox.id,
      quantity: '1.00',
      unitPrice: dcBox.sellPrice,
      unitCost: dcBox.costPrice,
      labourHours: '1.50',
    },
  });

  const startedAt = daysFromNow(-8, 10, 0);
  const endedAt = daysFromNow(-8, 12, 30);
  await prisma.timeLog.create({
    data: {
      technicianId: ctx.staff.install3.id,
      entityType: 'TICKET',
      entityId: ticket.id,
      startedAt,
      endedAt,
      minutes: minutesBetween(startedAt, endedAt),
      approved: true,
    },
  });

  // The warranty cost booked against the project — what ticket.closed does at runtime.
  const labourCost = 1.5 * 300;
  await prisma.expense.create({
    data: {
      projectId: project.id,
      ticketId: ticket.id,
      category: 'MISC',
      amount: money(Number(dcBox.costPrice) + labourCost),
      description: `Warranty service on ${ticket.number} — DC distribution box plus 1.5 h labour at cost`,
      spentAt: daysFromNow(-8, 13, 0),
      createdById: ctx.staff.support.id,
    },
  });

  return ticket;
}

/**
 * The chargeable, out-of-warranty ticket.
 *
 * Why: the other half of BR-11. Srinivas Reddy's system was delivered 27 months ago, so the
 *      24-month inverter warranty has expired and the parts, labour and visit charge are
 *      billed automatically as a SERVICE invoice.
 */
async function chargeableTicket(prisma, ctx, project, customer) {
  const inverter = await findUnit(prisma, project.id, 'INVERTER');
  const labourRate = 450;
  const visitCharge = 500;
  const labourHours = 2;

  // Deliberately a repair, not a unit swap: the inverter must stay DELIVERED with an
  // EXPIRED warranty so the demo can raise a fresh chargeable ticket against it (BR-11).
  // The D-07 inheritance rule is demonstrated by warrantyReplacementTicket instead.
  const part = await prisma.product.findUnique({ where: { sku: 'ACB-STD-1P' } });

  const createdAt = daysFromNow(-5, 11, 10);

  const ticket = await prisma.ticket.create({
    data: {
      number: nextSeedCode('TKT'),
      customerId: customer.id,
      projectId: project.id,
      serialUnitId: inverter.id,
      source: 'PHONE',
      category: 'INVERTER_FAULT',
      faultCode: 'E-11',
      description:
        'No generation since Tuesday. Inverter fan noisy for a few weeks, now showing E-11 and shutting down.',
      priority: 'CRITICAL',
      status: 'RESOLVED',
      isUnderWarranty: false,
      isChargeable: true,
      assignedToId: ctx.staff.install1.id,
      createdById: ctx.staff.support.id,
      resolutionNote:
        'AC distribution box MCB had welded contacts, out of warranty by three months. Replaced the AC box and re-commissioned. Parts and labour billed.',
      resolvedAt: daysFromNow(-4, 16, 0),
      createdAt,
      activities: {
        create: [
          { userId: ctx.staff.support.id, type: 'CALL', message: `Warranty on ${inverter.serialNumber} expired. Explained the parts and labour charge; customer approved.`, createdAt },
          { userId: ctx.staff.install1.id, type: 'VISIT', message: 'AC box MCB contacts welded shut. Replacing the box; the inverter itself tests fine.', createdAt: daysFromNow(-4, 11, 30) },
        ],
      },
    },
  });

  await prisma.ticketPart.create({
    data: {
      ticketId: ticket.id,
      productId: part.id,
      quantity: '1.00',
      unitPrice: part.sellPrice,
      unitCost: part.costPrice,
      labourHours: money(labourHours),
    },
  });

  const startedAt = daysFromNow(-4, 11, 0);
  const endedAt = daysFromNow(-4, 13, 0);
  await prisma.timeLog.create({
    data: {
      technicianId: ctx.staff.install1.id,
      entityType: 'TICKET',
      entityId: ticket.id,
      startedAt,
      endedAt,
      minutes: minutesBetween(startedAt, endedAt),
      approved: true,
    },
  });

  // The SERVICE invoice the ticket.billable listener produces: parts + labour + visit charge.
  const partPrice = Number(part.sellPrice);
  const subtotal = partPrice + labourHours * labourRate + visitCharge;
  const taxTotal = (subtotal * 18) / 100;

  await prisma.invoice.create({
    data: {
      number: nextSeedCode('INV'),
      customerId: customer.id,
      projectId: project.id,
      ticketId: ticket.id,
      type: 'SERVICE',
      status: 'ISSUED',
      issueDate: daysFromNow(-4, 16, 30),
      dueDate: daysFromNow(3),
      subtotal: money(subtotal),
      taxTotal: money(taxTotal),
      total: money(subtotal + taxTotal),
      amountPaid: '0.00',
      notes: `Out-of-warranty service on ${ticket.number}.`,
      lines: {
        create: [
          { description: `${part.name} (replacement, out of warranty)`, quantity: '1.00', unitPrice: money(partPrice), taxPercent: '18.00', lineTotal: money(partPrice) },
          { description: 'Technician labour', quantity: money(labourHours), unitPrice: money(labourRate), taxPercent: '18.00', lineTotal: money(labourHours * labourRate) },
          { description: 'Service visit charge', quantity: '1.00', unitPrice: money(visitCharge), taxPercent: '18.00', lineTotal: money(visitCharge) },
        ],
      },
    },
  });

  return ticket;
}

/**
 * A unit replaced UNDER warranty, where the new unit inherits the remaining window (D-07).
 *
 * Why: this is the rule that is easiest to get wrong and most expensive if you do. Replacing
 *      an inverter at month 20 must not hand the customer a fresh 24 months — that would be
 *      an unbounded warranty liability every time something broke. The replacement carries
 *      the ORIGINAL end date, and the old unit's warranty is voided with a reason so the
 *      chain is auditable years later.
 */
async function warrantyReplacementTicket(prisma, ctx, project, customer) {
  const inverter = await findUnit(prisma, project.id, 'INVERTER');
  if (!inverter?.warranty) return null;

  const replacement = await prisma.serialUnit.findFirst({
    where: { productId: inverter.productId, status: 'IN_STOCK' },
    include: { product: true },
  });
  if (!replacement) return null;

  const createdAt = daysFromNow(-7, 10, 5);
  const swapDate = daysFromNow(-6, 15, 20);

  const ticket = await prisma.ticket.create({
    data: {
      number: nextSeedCode('TKT'),
      customerId: customer.id,
      projectId: project.id,
      serialUnitId: inverter.id,
      source: 'PHONE',
      category: 'NO_POWER',
      faultCode: 'E-07',
      description:
        'Inverter dead on arrival of the morning sun — no display, no output. Installed three weeks ago.',
      priority: 'CRITICAL',
      status: 'CLOSED',
      isUnderWarranty: true,
      isChargeable: false,
      assignedToId: ctx.staff.install1.id,
      createdById: ctx.staff.support.id,
      resolutionNote:
        'Early-life failure of the inverter. Swapped for a new unit under warranty at no charge. The replacement carries the remaining warranty of the original unit (D-07).',
      resolvedAt: swapDate,
      customerConfirmedAt: daysFromNow(-6, 19, 0),
      createdAt,
      activities: {
        create: [
          { userId: ctx.staff.support.id, type: 'CALL', message: `Unit ${inverter.serialNumber} is under warranty. Replacement approved, no charge to the customer.`, createdAt },
          { userId: ctx.staff.install1.id, type: 'VISIT', message: `Replaced with ${replacement.serialNumber}. Generation verified. Old unit returned for RMA.`, createdAt: swapDate },
        ],
      },
    },
  });

  await prisma.ticketPart.create({
    data: {
      ticketId: ticket.id,
      productId: inverter.productId,
      quantity: '1.00',
      unitPrice: replacement.product.sellPrice,
      unitCost: replacement.unitCost,
      oldSerialId: inverter.id,
      newSerialId: replacement.id,
      labourHours: '2.00',
    },
  });

  await prisma.serialUnit.update({
    where: { id: inverter.id },
    data: {
      status: 'REPLACED',
      replacedById: replacement.id,
      notes: `Replaced under ${ticket.number} — early-life failure, under warranty`,
    },
  });
  await prisma.serialUnit.update({
    where: { id: replacement.id },
    data: { status: 'DELIVERED', projectId: project.id, dispatchId: inverter.dispatchId },
  });

  await prisma.warranty.update({
    where: { id: inverter.warranty.id },
    data: { voidReason: `Unit replaced under ${ticket.number}; warranty transferred to ${replacement.serialNumber}` },
  });

  // The inheritance itself: the SAME endDate as the unit it replaced, not a fresh 24 months.
  await prisma.warranty.create({
    data: {
      serialUnitId: replacement.id,
      customerId: customer.id,
      projectId: project.id,
      startDate: swapDate,
      endDate: inverter.warranty.endDate,
    },
  });

  // Free to the customer, so the cost is booked against the project (BR-11, BR-13).
  await prisma.expense.create({
    data: {
      projectId: project.id,
      ticketId: ticket.id,
      category: 'MISC',
      amount: money(Number(replacement.unitCost) + 2 * 300),
      description: `Warranty replacement on ${ticket.number} — inverter at cost plus 2 h labour`,
      spentAt: swapDate,
      createdById: ctx.staff.support.id,
    },
  });

  return ticket;
}

/**
 * Creates every ticket, a draft payout, notifications and the audit trail.
 *
 * Flow: the two BR-11 tickets -> an open ticket and one awaiting parts -> a DRAFT payout from
 *       the month's approved TimeLogs -> a few notifications -> audit rows for the discount
 *       change and a serial override.
 * Example:
 *   await seedService(prisma, ctx, projects)
 *   // → { tickets: 4, payouts: 3 }
 * Throws: nothing of its own.
 */
export async function seedService(prisma, ctx, projects) {
  const { staff, customers } = ctx;

  await warrantyTicket(prisma, ctx, projects.vipul.project, customers.vipul);
  await chargeableTicket(prisma, ctx, projects.srinivas.project, customers.srinivas);
  // D-07 goes on the loss-making project: a warranty replacement is exactly the kind of
  // cost that turns a discounted job negative, which is what the director needs to find.
  // It also keeps the two warranty-status demo systems untouched.
  await warrantyReplacementTicket(prisma, ctx, projects.anitha.project, customers.anitha);

  // An OPEN ticket, so the support queue has live work on it.
  const panel = await prisma.serialUnit.findFirst({
    where: { projectId: projects.anitha.project.id, product: { category: 'PANEL' } },
  });
  await prisma.ticket.create({
    data: {
      number: nextSeedCode('TKT'),
      customerId: customers.anitha.id,
      projectId: projects.anitha.project.id,
      serialUnitId: panel?.id ?? null,
      source: 'PORTAL',
      category: 'LOW_GENERATION',
      description:
        'Generation has dropped from about 13 units a day to 8 over the last two weeks. No error on the inverter.',
      priority: 'MEDIUM',
      status: 'OPEN',
      isUnderWarranty: true,
      isChargeable: false,
      createdById: null,
      createdAt: daysFromNow(-1, 19, 40),
      activities: {
        create: [
          { userId: null, type: 'NOTE', message: 'Raised from the customer portal.', createdAt: daysFromNow(-1, 19, 40) },
        ],
      },
    },
  });

  // AWAITING_PARTS, so the status is represented and the warehouse has a reason to order.
  const battery = await prisma.serialUnit.findFirst({
    where: { projectId: projects.swapna.project.id, product: { category: 'BATTERY' } },
  });
  await prisma.ticket.create({
    data: {
      number: nextSeedCode('TKT'),
      customerId: customers.swapna.id,
      projectId: projects.swapna.project.id,
      serialUnitId: battery?.id ?? null,
      source: 'WHATSAPP',
      category: 'BATTERY_ISSUE',
      faultCode: 'LOW-V',
      description: 'One battery in the bank is reading 10.4 V on load and pulling the whole string down.',
      priority: 'HIGH',
      status: 'AWAITING_PARTS',
      isUnderWarranty: true,
      isChargeable: false,
      assignedToId: staff.install2.id,
      createdById: staff.support.id,
      createdAt: daysFromNow(-3, 9, 50),
      activities: {
        create: [
          { userId: staff.install2.id, type: 'VISIT', message: 'Cell failure in one 150 Ah unit. Under warranty — replacement requested from the supplier.', createdAt: daysFromNow(-2, 15, 20) },
          { userId: staff.support.id, type: 'STATUS_CHANGE', message: 'Awaiting the replacement battery from PowerCell, expected in four days.', createdAt: daysFromNow(-2, 16, 0) },
        ],
      },
    },
  });

  // --- A DRAFT payout for the current month, from approved TimeLogs ---
  const periodStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 0));

  const technicians = await prisma.user.findMany({
    where: { role: { in: ['INSTALLATION_TECHNICIAN', 'SURVEY_TECHNICIAN'] }, isActive: true },
    select: { id: true, hourlyRate: true },
  });

  let payouts = 0;
  for (const tech of technicians) {
    const logs = await prisma.timeLog.aggregate({
      where: {
        technicianId: tech.id,
        approved: true,
        startedAt: { gte: periodStart, lte: periodEnd },
      },
      _sum: { minutes: true },
    });

    const minutes = logs._sum.minutes ?? 0;
    if (minutes === 0) continue;

    const rate = Number(tech.hourlyRate ?? 0);
    await prisma.payout.create({
      data: {
        technicianId: tech.id,
        periodStart,
        periodEnd,
        totalMinutes: minutes,
        // The rate is stored on the row so a later rate change cannot rewrite this payout.
        hourlyRate: money(rate),
        incentive: '0.00',
        amount: money((minutes / 60) * rate),
        status: 'DRAFT',
      },
    });
    payouts += 1;
  }

  // --- Notifications, so the bell is not empty on first login ---
  await prisma.notification.createMany({
    data: [
      { userId: staff.sales1.id, title: 'ENQ-2026-0013 has not been contacted', body: 'Sunita Agarwal, Begumpet — no call logged in 24 hours.', link: '/sales/leads', isRead: false, createdAt: daysFromNow(-1, 9, 0) },
      { userId: staff.sales1.id, title: 'Survey report ready for review', body: 'Ashok Varma, Nizampet — 4 kW On-Grid recommended.', link: '/sales/surveys', isRead: false, createdAt: daysFromNow(-2, 13, 0) },
      { userId: staff.warehouse.id, title: `${projects.rohini.project.code} confirmed — pick list ready`, body: '4 kW On-Grid for Rohini Deshpande, Kothapet.', link: '/warehouse/dispatches', isRead: false, createdAt: daysFromNow(-2, 12, 10) },
      { userId: staff.warehouse.id, title: `${projects.iqbal.project.code} confirmed — pick list ready`, body: '2 kW On-Grid for Iqbal Hussain, Charminar Road.', link: '/warehouse/dispatches', isRead: true, createdAt: daysFromNow(-3, 12, 10) },
      { userId: staff.install1.id, title: 'Installation scheduled', body: `${projects.nagaraju.project.code} — Nagaraju Textiles, 5 kW On-Grid. You are the crew lead.`, link: '/field/jobs', isRead: false, createdAt: daysFromNow(-4, 17, 0) },
      { userId: staff.survey1.id, title: 'Survey scheduled for today', body: 'Padmaja Sharma, Punjagutta — 3 pm.', link: '/field/surveys', isRead: false, createdAt: daysFromNow(0, 8, 0) },
      { userId: staff.support.id, title: 'New service request from the portal', body: 'Anitha Rao — generation down from 13 to 8 units a day.', link: '/support/tickets', isRead: false, createdAt: daysFromNow(-1, 19, 41) },
      { userId: staff.director.id, title: `${projects.gopal.project.code} installed and invoiced`, body: 'Gopal Krishna Murthy, 2 kW On-Grid. Balance invoice issued.', link: '/director', isRead: true, createdAt: daysFromNow(-14, 10, 5) },
    ],
  });

  // --- Audit rows: the two sensitive changes the demo points at (BR-18) ---
  await prisma.auditLog.createMany({
    data: [
      {
        userId: staff.director.id,
        action: 'QUOTE_DISCOUNT_CHANGED',
        entityType: 'Quote',
        entityId: projects.anitha.project.quoteId,
        before: { discount: '0.00' },
        after: { discount: '22000.00' },
        ip: '103.21.244.18',
        createdAt: daysFromNow(-49, 16, 30),
      },
      {
        userId: staff.warehouse.id,
        action: 'INVENTORY_ADJUSTED',
        entityType: 'Product',
        entityId: (await prisma.product.findUnique({ where: { sku: 'CON-MC4-PR' } })).id,
        before: { stockQty: 424 },
        after: { stockQty: 410 },
        ip: '103.21.244.18',
        createdAt: daysFromNow(-12, 11, 0),
      },
      {
        userId: staff.support.id,
        action: 'SERIAL_OVERRIDDEN',
        entityType: 'SerialUnit',
        entityId: (await prisma.serialUnit.findFirst({ where: { status: 'REPLACED' } }))?.id ?? null,
        before: { status: 'DELIVERED' },
        after: { status: 'REPLACED' },
        ip: '103.21.244.18',
        createdAt: daysFromNow(-4, 16, 5),
      },
      {
        userId: staff.admin.id,
        action: 'SETTINGS_UPDATED',
        entityType: 'Setting',
        entityId: null,
        before: { labourRatePerHour: 400 },
        after: { labourRatePerHour: 450 },
        ip: '103.21.244.18',
        createdAt: daysFromNow(-60, 10, 0),
      },
    ],
  });

  return { payouts };
}
