import { code, daysFromNow, money } from './helpers.js';

/**
 * Lead, survey and quote helpers plus the standalone funnel rows.
 *
 * The quote builder here mirrors what quotes.service.js must do for BR-04: expand every
 * KitTemplateItem into a priced QuoteItem at the product's current sellPrice and taxPercent,
 * and compute the totals from the lines rather than trusting a figure passed in.
 */

/** Running code counters, so the seed's numbers are sequential and the Counter table matches. */
export const counters = { ENQ: 0, QT: 0, PRJ: 0, DSP: 0, TKT: 0, INV: 0 };

export function nextSeedCode(prefix) {
  counters[prefix] += 1;
  return code(prefix, counters[prefix]);
}

/**
 * Creates a lead.
 *
 * Why: every project in the demo must trace back to an enquiry, because that is the trail
 *      the problem statement says goes missing today.
 */
export async function createLead(prisma, data) {
  return prisma.lead.create({
    data: {
      code: nextSeedCode('ENQ'),
      customerId: data.customerId ?? null,
      name: data.name,
      phone: data.phone,
      email: data.email ?? null,
      address: data.address ?? null,
      city: data.city ?? 'Hyderabad',
      pincode: data.pincode ?? null,
      source: data.source,
      requestedSystemType: data.requestedSystemType ?? 'NOT_SURE',
      requestedCapacityKw: data.requestedCapacityKw ? money(data.requestedCapacityKw) : null,
      wantsSubsidy: data.wantsSubsidy ?? false,
      status: data.status,
      assignedToId: data.assignedToId ?? null,
      duplicateOfId: data.duplicateOfId ?? null,
      firstContactedAt: data.firstContactedAt ?? null,
      lostReason: data.lostReason ?? null,
      roofAreaSqft: data.roofAreaSqft ?? null,
      monthlyBillInr: data.monthlyBillInr ? money(data.monthlyBillInr) : null,
      gridConnectionOk: data.gridConnectionOk ?? null,
      sanctionedLoadKw: data.sanctionedLoadKw ? money(data.sanctionedLoadKw) : null,
      qualificationNotes: data.qualificationNotes ?? null,
      createdAt: data.createdAt ?? daysFromNow(-10),
    },
  });
}

/** The call log a sales executive reads before dialling again. */
export async function addLeadActivities(prisma, leadId, userId, entries) {
  for (const entry of entries) {
    await prisma.leadActivity.create({
      data: {
        leadId,
        userId,
        type: entry.type,
        message: entry.message,
        createdAt: entry.at,
      },
    });
  }
}

/**
 * Creates a survey, optionally completed and approved.
 *
 * Why: BR-03 — a quote can only exist where the survey is APPROVED, so every seeded project
 *      must carry a genuinely approved survey rather than a shortcut.
 */
export async function createSurvey(prisma, data) {
  return prisma.survey.create({
    data: {
      leadId: data.leadId,
      technicianId: data.technicianId,
      scheduledAt: data.scheduledAt,
      status: data.status,
      roofType: data.roofType ?? null,
      shadowFreeAreaSqft: data.shadowFreeAreaSqft ?? null,
      roofDirection: data.roofDirection ?? null,
      tiltDegrees: data.tiltDegrees ?? null,
      cableDistanceMeters: data.cableDistanceMeters ?? null,
      structureHeightFt: data.structureHeightFt ?? null,
      earthingPointAvailable: data.earthingPointAvailable ?? null,
      recommendedCapacityKw: data.recommendedCapacityKw ? money(data.recommendedCapacityKw) : null,
      recommendedSystemType: data.recommendedSystemType ?? null,
      notes: data.notes ?? null,
      submittedAt: data.submittedAt ?? null,
      reviewedById: data.reviewedById ?? null,
      reviewedAt: data.reviewedAt ?? null,
      rejectionReason: data.rejectionReason ?? null,
      createdAt: data.createdAt ?? data.scheduledAt,
    },
  });
}

/**
 * Builds a quote from a kit template, exactly as BR-04 requires.
 *
 * Why: the demo's whole "the parts list fills itself" moment depends on the seeded quotes
 *      having the full bill of materials, not a single summary line.
 * Flow: load the kit with its items and products -> price each line at the product's current
 *       sellPrice -> sum the lines -> apply the discount -> tax each line's share -> create
 *       the Quote with its items in one call.
 * Example:
 *   const quote = await createQuoteFromKit(prisma, {
 *     kit, leadId, customerId, createdById, status: "ACCEPTED", discount: 4000,
 *   })
 *   // → { number: "QT-2026-0003", total: "1,80,000" as Decimal, items: [...] }
 * Throws: nothing of its own.
 */
export async function createQuoteFromKit(prisma, opts) {
  const kit = await prisma.kitTemplate.findUnique({
    where: { id: opts.kitId },
    include: { items: { include: { product: true } } },
  });

  const lines = kit.items.map((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.product.sellPrice);
    return {
      productId: item.productId,
      description: item.product.name,
      quantity: money(quantity),
      unitPrice: money(unitPrice),
      taxPercent: money(Number(item.product.taxPercent)),
      lineTotal: money(quantity * unitPrice),
    };
  });

  const subtotal = lines.reduce((acc, l) => acc + Number(l.lineTotal), 0);
  const discount = opts.discount ?? 0;
  const taxable = subtotal - discount;

  // Tax is computed per line on the discounted share, so the total matches what an invoice
  // built from the same lines would produce (BR-14).
  const taxTotal = lines.reduce((acc, l) => {
    const share = Number(l.lineTotal) / subtotal;
    return acc + ((taxable * share) * Number(l.taxPercent)) / 100;
  }, 0);

  const total = taxable + taxTotal;

  return prisma.quote.create({
    data: {
      number: nextSeedCode('QT'),
      leadId: opts.leadId,
      customerId: opts.customerId,
      kitTemplateId: kit.id,
      status: opts.status,
      systemType: kit.systemType,
      capacityKw: kit.capacityKw,
      subtotal: money(subtotal),
      discount: money(discount),
      taxTotal: money(taxTotal),
      total: money(total),
      validUntil: opts.validUntil,
      notes: opts.notes ?? null,
      sentAt: opts.sentAt ?? null,
      acceptedAt: opts.acceptedAt ?? null,
      acceptedById: opts.acceptedById ?? null,
      createdById: opts.createdById,
      createdAt: opts.createdAt ?? opts.sentAt ?? daysFromNow(-20),
      items: { create: lines },
    },
    include: { items: true },
  });
}

/**
 * The standalone funnel: leads in every LeadStatus, plus surveys and quotes in the statuses
 * the seeded projects do not produce.
 *
 * Why: every role's first screen must have something real on it, and TESTING.md expects an
 *      overdue lead (BR-02) and a linked duplicate (BR-01) to exist on first load.
 * Flow: create the leads one at a time (the duplicate needs the original's id), then the
 *       surveys and quotes that hang off the right ones.
 * Example:
 *   await seedStandaloneFunnel(prisma, { staff, customers, kits })
 *   // → { leads: 17, surveys: 5, quotes: 4 }
 * Throws: nothing of its own.
 */
export async function seedStandaloneFunnel(prisma, { staff, customers, kits }) {
  const { sales1, sales2, survey1, survey2 } = staff;

  // --- NEW: two fresh web enquiries, one of them a duplicate phone (BR-01) ---
  const newWeb = await createLead(prisma, {
    name: 'Krishna Chaitanya',
    phone: '9701556622',
    email: 'krishna.c@example.in',
    address: '7-1-24, Ameerpet',
    pincode: '500016',
    source: 'WEB_FORM',
    requestedSystemType: 'ON_GRID',
    requestedCapacityKw: 3,
    wantsSubsidy: true,
    status: 'NEW',
    createdAt: daysFromNow(0, 8, 15),
  });

  const duplicate = await createLead(prisma, {
    // Same phone as Krishna's enquiry above: flagged and linked, never rejected (BR-01).
    name: 'Krishna Chaitanya',
    phone: '9701556622',
    source: 'WHATSAPP',
    requestedSystemType: 'ON_GRID',
    requestedCapacityKw: 3,
    wantsSubsidy: true,
    status: 'NEW',
    duplicateOfId: newWeb.id,
    createdAt: daysFromNow(0, 10, 40),
  });

  // --- NEW but overdue: created three days ago, never contacted (BR-02) ---
  const overdue = await createLead(prisma, {
    name: 'Sunita Agarwal',
    phone: '9885013377',
    address: '1-10-72, Begumpet',
    pincode: '500016',
    source: 'PHONE_CALL',
    requestedSystemType: 'NOT_SURE',
    requestedCapacityKw: 2,
    status: 'NEW',
    assignedToId: sales2.id,
    createdAt: daysFromNow(-3, 16, 20),
  });

  // --- CONTACTED ---
  const contacted = await createLead(prisma, {
    name: 'Mohammed Arif',
    phone: '9000112233',
    address: '16-2-741, Malakpet',
    pincode: '500036',
    source: 'REFERRAL',
    requestedSystemType: 'OFF_GRID',
    requestedCapacityKw: 3,
    status: 'CONTACTED',
    assignedToId: sales1.id,
    firstContactedAt: daysFromNow(-2, 11, 5),
    createdAt: daysFromNow(-4),
  });
  await addLeadActivities(prisma, contacted.id, sales1.id, [
    { type: 'CALL', message: 'Spoke to Mr Arif. Frequent outages in the area, wants battery backup. Asked him to check his sanctioned load.', at: daysFromNow(-2, 11, 5) },
  ]);

  // --- QUALIFIED, waiting for a survey slot ---
  const qualified = await createLead(prisma, {
    name: 'Venkatesh Naidu',
    phone: '9440233445',
    address: 'Plot 64, Kompally',
    pincode: '500014',
    source: 'WEB_FORM',
    requestedSystemType: 'ON_GRID',
    requestedCapacityKw: 5,
    wantsSubsidy: true,
    status: 'QUALIFIED',
    assignedToId: sales1.id,
    firstContactedAt: daysFromNow(-5, 10, 0),
    roofAreaSqft: 780,
    monthlyBillInr: 7400,
    gridConnectionOk: true,
    sanctionedLoadKw: 6,
    qualificationNotes: 'Independent house, clear terrace, no shading. Three-phase connection already in place.',
    createdAt: daysFromNow(-6),
  });
  await addLeadActivities(prisma, qualified.id, sales1.id, [
    { type: 'CALL', message: 'Qualification call. Roof 780 sqft, bill Rs 7,400/month, three-phase 6 kW sanctioned. Good fit for 5 kW.', at: daysFromNow(-5, 10, 0) },
    { type: 'NOTE', message: 'Wants the survey on a Saturday. Offered this weekend.', at: daysFromNow(-4, 17, 30) },
  ]);

  // --- NOT_QUALIFIED: the shaded roof we have to say no to ---
  await createLead(prisma, {
    name: 'Deepak Jain',
    phone: '9393044556',
    address: '3-4-512, Narayanguda',
    pincode: '500029',
    source: 'WALK_IN',
    requestedSystemType: 'ON_GRID',
    requestedCapacityKw: 2,
    status: 'NOT_QUALIFIED',
    assignedToId: sales2.id,
    firstContactedAt: daysFromNow(-8, 12, 0),
    roofAreaSqft: 180,
    monthlyBillInr: 1600,
    gridConnectionOk: true,
    sanctionedLoadKw: 2,
    qualificationNotes: 'Second-floor flat, roof is shared and shaded by the adjacent building after 1 pm. Not viable.',
    createdAt: daysFromNow(-9),
  });

  // --- SURVEY_SCHEDULED: today's job for the field demo ---
  const scheduled = await createLead(prisma, {
    name: 'Padmaja Sharma',
    phone: '9848077881',
    address: '6-3-347, Dwarakapuri Colony, Punjagutta',
    pincode: '500082',
    source: 'WEB_FORM',
    requestedSystemType: 'ON_GRID',
    requestedCapacityKw: 3,
    wantsSubsidy: true,
    status: 'SURVEY_SCHEDULED',
    assignedToId: sales1.id,
    firstContactedAt: daysFromNow(-3, 9, 45),
    roofAreaSqft: 520,
    monthlyBillInr: 4200,
    gridConnectionOk: true,
    sanctionedLoadKw: 4,
    qualificationNotes: 'RCC terrace, south facing, no water tank in the way.',
    createdAt: daysFromNow(-4),
  });
  await addLeadActivities(prisma, scheduled.id, sales1.id, [
    { type: 'CALL', message: 'Qualified. Roof 520 sqft, bill Rs 4,200/month, 4 kW sanctioned. Survey booked with Mahesh.', at: daysFromNow(-3, 9, 45) },
  ]);
  // Today, so "My surveys" has a live job the moment the demo starts.
  const todaySurvey = await createSurvey(prisma, {
    leadId: scheduled.id,
    technicianId: survey1.id,
    scheduledAt: daysFromNow(0, 15, 0),
    status: 'SCHEDULED',
  });

  // --- IN_PROGRESS: a technician is on the roof right now ---
  const inProgressLead = await createLead(prisma, {
    name: 'Satyanarayana Rao',
    phone: '9440511223',
    address: '5-1-244, Kachiguda',
    pincode: '500027',
    source: 'REFERRAL',
    requestedSystemType: 'ON_GRID',
    requestedCapacityKw: 3,
    status: 'SURVEY_SCHEDULED',
    assignedToId: sales2.id,
    firstContactedAt: daysFromNow(-5, 11, 30),
    roofAreaSqft: 480,
    monthlyBillInr: 3700,
    gridConnectionOk: true,
    sanctionedLoadKw: 4,
    createdAt: daysFromNow(-6),
  });
  await createSurvey(prisma, {
    leadId: inProgressLead.id,
    technicianId: survey2.id,
    scheduledAt: daysFromNow(0, 11, 0),
    status: 'IN_PROGRESS',
  });

  // --- CANCELLED: the customer was not at home ---
  await createSurvey(prisma, {
    leadId: qualified.id,
    technicianId: survey1.id,
    scheduledAt: daysFromNow(-3, 16, 0),
    status: 'CANCELLED',
    notes: 'Customer was travelling. Rescheduled over the phone.',
  });

  // --- SURVEY_DONE: submitted, waiting on sales to review ---
  const surveyDone = await createLead(prisma, {
    name: 'Ashok Varma',
    phone: '9959122334',
    address: '2-48/5, Nizampet',
    pincode: '500090',
    source: 'REFERRAL',
    requestedSystemType: 'ON_GRID',
    requestedCapacityKw: 4,
    wantsSubsidy: true,
    status: 'SURVEY_DONE',
    assignedToId: sales2.id,
    firstContactedAt: daysFromNow(-7, 10, 15),
    roofAreaSqft: 640,
    monthlyBillInr: 5900,
    gridConnectionOk: true,
    sanctionedLoadKw: 5,
    createdAt: daysFromNow(-8),
  });
  await createSurvey(prisma, {
    leadId: surveyDone.id,
    technicianId: survey2.id,
    scheduledAt: daysFromNow(-2, 10, 0),
    status: 'SUBMITTED',
    roofType: 'RCC',
    shadowFreeAreaSqft: 580,
    roofDirection: 'SE',
    tiltDegrees: 12,
    cableDistanceMeters: 22,
    structureHeightFt: 3,
    earthingPointAvailable: true,
    recommendedCapacityKw: 4,
    recommendedSystemType: 'ON_GRID',
    notes: 'Clear terrace. Parapet on the west side casts a short shadow after 5 pm — negligible.',
    submittedAt: daysFromNow(-2, 12, 40),
  });

  // --- SURVEY_REJECTED: the report that went back ---
  const rejected = await createLead(prisma, {
    name: 'Bhavani Devi',
    phone: '9701388990',
    address: '11-4-659, Red Hills',
    pincode: '500004',
    source: 'PHONE_CALL',
    requestedSystemType: 'ON_GRID',
    requestedCapacityKw: 3,
    status: 'SURVEY_REJECTED',
    assignedToId: sales1.id,
    firstContactedAt: daysFromNow(-12, 11, 0),
    roofAreaSqft: 460,
    monthlyBillInr: 3800,
    gridConnectionOk: true,
    sanctionedLoadKw: 3,
    createdAt: daysFromNow(-14),
  });
  await createSurvey(prisma, {
    leadId: rejected.id,
    technicianId: survey2.id,
    scheduledAt: daysFromNow(-6, 15, 30),
    status: 'REJECTED',
    roofType: 'TILED',
    shadowFreeAreaSqft: 300,
    roofDirection: 'W',
    tiltDegrees: 25,
    cableDistanceMeters: 41,
    earthingPointAvailable: false,
    recommendedCapacityKw: 3,
    recommendedSystemType: 'ON_GRID',
    notes: 'Tiled roof, west facing.',
    submittedAt: daysFromNow(-6, 17, 10),
    reviewedById: sales1.id,
    reviewedAt: daysFromNow(-5, 10, 30),
    rejectionReason: 'Cable distance and earthing not measured properly, and no photo of the roof edge. Please revisit.',
  });

  // --- SURVEY_APPROVED, quote not yet raised: the demo's "create a quote" starting point ---
  const approvedNoQuote = await createLead(prisma, {
    name: 'Rajesh Kalyan',
    phone: '9866244556',
    address: '8-3-231, Yousufguda',
    pincode: '500045',
    source: 'WEB_FORM',
    requestedSystemType: 'ON_GRID',
    requestedCapacityKw: 3,
    wantsSubsidy: true,
    status: 'SURVEY_APPROVED',
    assignedToId: sales1.id,
    firstContactedAt: daysFromNow(-9, 9, 20),
    roofAreaSqft: 500,
    monthlyBillInr: 4400,
    gridConnectionOk: true,
    sanctionedLoadKw: 4,
    qualificationNotes: 'Ready to proceed as soon as the price is confirmed.',
    createdAt: daysFromNow(-10),
  });
  await createSurvey(prisma, {
    leadId: approvedNoQuote.id,
    technicianId: survey1.id,
    scheduledAt: daysFromNow(-5, 11, 0),
    status: 'APPROVED',
    roofType: 'RCC',
    shadowFreeAreaSqft: 470,
    roofDirection: 'S',
    tiltDegrees: 15,
    cableDistanceMeters: 18,
    structureHeightFt: 2,
    earthingPointAvailable: true,
    recommendedCapacityKw: 3,
    recommendedSystemType: 'ON_GRID',
    notes: 'Ideal south-facing RCC terrace. Inverter can go in the stair room.',
    submittedAt: daysFromNow(-5, 13, 15),
    reviewedById: sales1.id,
    reviewedAt: daysFromNow(-4, 9, 50),
  });

  // --- QUOTED: a quote sent and still open ---
  const quotedLead = await createLead(prisma, {
    customerId: customers.ramesh.id,
    name: customers.ramesh.name,
    phone: customers.ramesh.phone,
    address: customers.ramesh.addressLine,
    pincode: customers.ramesh.pincode,
    source: 'WEB_FORM',
    requestedSystemType: 'ON_GRID',
    requestedCapacityKw: 3,
    wantsSubsidy: true,
    status: 'QUOTED',
    assignedToId: sales1.id,
    firstContactedAt: daysFromNow(-18, 10, 0),
    roofAreaSqft: 540,
    monthlyBillInr: 4600,
    gridConnectionOk: true,
    sanctionedLoadKw: 4,
    createdAt: daysFromNow(-20),
  });
  await createSurvey(prisma, {
    leadId: quotedLead.id,
    technicianId: survey1.id,
    scheduledAt: daysFromNow(-16, 10, 0),
    status: 'APPROVED',
    roofType: 'RCC',
    shadowFreeAreaSqft: 500,
    roofDirection: 'S',
    tiltDegrees: 14,
    cableDistanceMeters: 20,
    structureHeightFt: 2,
    earthingPointAvailable: true,
    recommendedCapacityKw: 3,
    recommendedSystemType: 'ON_GRID',
    submittedAt: daysFromNow(-16, 12, 30),
    reviewedById: sales1.id,
    reviewedAt: daysFromNow(-15, 9, 40),
  });
  await createQuoteFromKit(prisma, {
    kitId: kits['3 kW On-Grid'].id,
    leadId: quotedLead.id,
    customerId: customers.ramesh.id,
    createdById: sales1.id,
    status: 'SENT',
    sentAt: daysFromNow(-14, 16, 0),
    validUntil: daysFromNow(1),
    notes: 'Subsidy paperwork included. Price held until the validity date.',
  });

  // --- A DRAFT quote still being put together ---
  await createQuoteFromKit(prisma, {
    kitId: kits['3 kW On-Grid'].id,
    leadId: approvedNoQuote.id,
    customerId: customers.lakshmi.id,
    createdById: sales1.id,
    status: 'DRAFT',
    validUntil: daysFromNow(15),
    notes: 'Awaiting confirmation on the elevated structure.',
    createdAt: daysFromNow(-1),
  });

  // --- An EXPIRED quote, and a REJECTED one ---
  const expiredLead = await createLead(prisma, {
    customerId: customers.lakshmi.id,
    name: customers.lakshmi.name,
    phone: customers.lakshmi.phone,
    address: customers.lakshmi.addressLine,
    pincode: customers.lakshmi.pincode,
    source: 'WALK_IN',
    requestedSystemType: 'OFF_GRID',
    requestedCapacityKw: 2,
    status: 'QUOTED',
    assignedToId: sales2.id,
    firstContactedAt: daysFromNow(-40, 11, 0),
    roofAreaSqft: 420,
    monthlyBillInr: 3100,
    gridConnectionOk: true,
    sanctionedLoadKw: 3,
    createdAt: daysFromNow(-42),
  });
  await createSurvey(prisma, {
    leadId: expiredLead.id,
    technicianId: survey2.id,
    scheduledAt: daysFromNow(-38, 10, 0),
    status: 'APPROVED',
    roofType: 'METAL_SHEET',
    shadowFreeAreaSqft: 400,
    roofDirection: 'SW',
    tiltDegrees: 18,
    cableDistanceMeters: 26,
    structureHeightFt: 1,
    earthingPointAvailable: true,
    recommendedCapacityKw: 2,
    recommendedSystemType: 'OFF_GRID',
    submittedAt: daysFromNow(-38, 13, 0),
    reviewedById: sales2.id,
    reviewedAt: daysFromNow(-37, 10, 0),
  });
  await createQuoteFromKit(prisma, {
    kitId: kits['2 kW Off-Grid'].id,
    leadId: expiredLead.id,
    customerId: customers.lakshmi.id,
    createdById: sales2.id,
    status: 'EXPIRED',
    sentAt: daysFromNow(-36, 15, 0),
    validUntil: daysFromNow(-21),
    notes: 'Customer did not respond before the validity expired.',
  });

  const lostLead = await createLead(prisma, {
    name: 'Prakash Rathi',
    phone: '9393155667',
    address: '4-1-882, Abids',
    pincode: '500001',
    source: 'PHONE_CALL',
    requestedSystemType: 'ON_GRID',
    requestedCapacityKw: 2,
    status: 'LOST',
    assignedToId: sales2.id,
    firstContactedAt: daysFromNow(-30, 12, 0),
    lostReason: 'Went with a local installer quoting Rs 9,000 less. Declined to match on a 2 kW job.',
    createdAt: daysFromNow(-32),
  });
  await addLeadActivities(prisma, lostLead.id, sales2.id, [
    { type: 'CALL', message: 'Quoted Rs 1,04,000. Customer comparing with two others.', at: daysFromNow(-28, 11, 0) },
    { type: 'STATUS_CHANGE', message: 'Marked lost — chose a cheaper local installer.', at: daysFromNow(-24, 17, 0) },
  ]);

  return {
    leads: {
      newWeb, duplicate, overdue, contacted, qualified, scheduled, inProgressLead,
      surveyDone, rejected, approvedNoQuote, quotedLead, expiredLead, lostLead,
    },
    todaySurvey,
  };
}
