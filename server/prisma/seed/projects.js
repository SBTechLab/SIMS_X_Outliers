import { addMonths, daysFromNow, dateOnly, minutesBetween, money } from './helpers.js';
import { createLead, createQuoteFromKit, createSurvey, nextSeedCode } from './funnel.js';
import { take } from './procurement.js';

/**
 * The ten projects, one per operational stage.
 *
 * Why these ten: every role's list must have something real in it on first load, the
 * director's profitability screen needs a loss-maker to find, and the "rainy season
 * breakdown" demo needs one system whose inverter warranty is still ACTIVE and one whose
 * warranty has EXPIRED (BR-11's two branches).
 *
 * `stage` is how far down the flow the project is taken. Each stage includes everything
 * before it, so the chain is always consistent with the state machine in PRD.md 6.4.
 */
const STAGES = [
  'AWAITING_ADVANCE',
  'CONFIRMED',
  'DISPATCHED',
  'DELIVERED',
  'INSTALLATION_SCHEDULED',
  'INSTALLED_UNPAID',
  'INSTALLED_LOSS',
  'CLOSED',
];

/** Extra customers without logins, so the ten projects do not all belong to demo accounts. */
const EXTRA_CUSTOMERS = [
  { key: 'gopal', name: 'Gopal Krishna Murthy', phone: '9848166552', addressLine: '7-2-1813, Sanath Nagar', city: 'Hyderabad', pincode: '500018', customerType: 'RESIDENTIAL' },
  { key: 'nagaraju', name: 'Nagaraju Textiles', phone: '9440277889', addressLine: 'Shed 11, IDA Jeedimetla', city: 'Hyderabad', pincode: '500055', customerType: 'COMMERCIAL' },
  { key: 'swapna', name: 'Swapna Gupta', phone: '9959388112', addressLine: '12-13-455, Tarnaka', city: 'Secunderabad', pincode: '500017', customerType: 'RESIDENTIAL' },
  { key: 'iqbal', name: 'Iqbal Hussain', phone: '9701499223', addressLine: '22-5-18, Charminar Road', city: 'Hyderabad', pincode: '500002', customerType: 'RESIDENTIAL' },
  { key: 'rohini', name: 'Rohini Deshpande', phone: '9866500334', addressLine: '3-2-91, Kothapet', city: 'Hyderabad', pincode: '500035', customerType: 'RESIDENTIAL' },
];

/** The checklist an installation crew ticks off — stored as Json on the job. */
const CHECKLIST = {
  structureMounted: true,
  panelsFixed: true,
  dcWiringDone: true,
  acWiringDone: true,
  earthingDone: true,
  inverterCommissioned: true,
  generationVerified: true,
  siteCleaned: true,
  customerBriefed: true,
};

/**
 * Creates the lead, survey, quote and project spine for one spec.
 *
 * Why: BR-03 — the survey must genuinely be APPROVED before the quote exists, so the demo
 *      data would survive the real server-side gate.
 */
async function buildSpine(prisma, spec, ctx) {
  const { staff, customers, kits } = ctx;
  const customer = customers[spec.customer];
  const offsetDays = spec.daysAgo;

  const lead = await createLead(prisma, {
    customerId: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email ?? null,
    address: customer.addressLine,
    city: customer.city,
    pincode: customer.pincode,
    source: spec.source ?? 'WEB_FORM',
    requestedSystemType: spec.systemType,
    requestedCapacityKw: spec.capacityKw,
    wantsSubsidy: spec.subsidyEligible,
    status: 'WON',
    assignedToId: staff[spec.salesKey].id,
    firstContactedAt: daysFromNow(-(offsetDays + 2), 10, 0),
    roofAreaSqft: spec.roofAreaSqft,
    monthlyBillInr: spec.monthlyBillInr,
    gridConnectionOk: true,
    sanctionedLoadKw: Math.ceil(spec.capacityKw * 1.2),
    qualificationNotes: spec.qualificationNotes,
    createdAt: daysFromNow(-(offsetDays + 4), 9, 0),
  });

  await prisma.leadActivity.createMany({
    data: [
      {
        leadId: lead.id,
        userId: staff[spec.salesKey].id,
        type: 'CALL',
        message: `Qualification call. Roof ${spec.roofAreaSqft} sqft, bill Rs ${spec.monthlyBillInr}/month. Fits ${spec.capacityKw} kW ${spec.systemType === 'ON_GRID' ? 'On-Grid' : 'Off-Grid'}.`,
        createdAt: daysFromNow(-(offsetDays + 2), 10, 0),
      },
      {
        leadId: lead.id,
        userId: staff[spec.salesKey].id,
        type: 'STATUS_CHANGE',
        message: 'Quote accepted. Order moving to the warehouse.',
        createdAt: daysFromNow(-offsetDays, 12, 0),
      },
    ],
  });

  const survey = await createSurvey(prisma, {
    leadId: lead.id,
    technicianId: staff[spec.surveyKey].id,
    scheduledAt: daysFromNow(-(offsetDays + 2), 11, 0),
    status: 'APPROVED',
    roofType: spec.roofType ?? 'RCC',
    shadowFreeAreaSqft: Math.round(spec.roofAreaSqft * 0.9),
    roofDirection: spec.roofDirection ?? 'S',
    tiltDegrees: 15,
    cableDistanceMeters: spec.cableDistanceMeters ?? 20,
    structureHeightFt: 2,
    earthingPointAvailable: true,
    recommendedCapacityKw: spec.capacityKw,
    recommendedSystemType: spec.systemType,
    notes: spec.surveyNotes,
    submittedAt: daysFromNow(-(offsetDays + 2), 13, 30),
    reviewedById: staff[spec.salesKey].id,
    reviewedAt: daysFromNow(-(offsetDays + 1), 10, 0),
  });

  // A survey takes about 90 minutes including travel — that is what the technician is paid for.
  const surveyStart = daysFromNow(-(offsetDays + 2), 11, 0);
  const surveyEnd = daysFromNow(-(offsetDays + 2), 12, 30);
  await prisma.timeLog.create({
    data: {
      technicianId: staff[spec.surveyKey].id,
      entityType: 'SURVEY',
      entityId: survey.id,
      startedAt: surveyStart,
      endedAt: surveyEnd,
      minutes: minutesBetween(surveyStart, surveyEnd),
      approved: true,
    },
  });

  const kitName = `${spec.capacityKw} kW ${spec.systemType === 'ON_GRID' ? 'On-Grid' : 'Off-Grid'}`;
  const quote = await createQuoteFromKit(prisma, {
    kitId: kits[kitName].id,
    leadId: lead.id,
    customerId: customer.id,
    createdById: staff[spec.salesKey].id,
    status: 'ACCEPTED',
    discount: spec.discount ?? 0,
    sentAt: daysFromNow(-(offsetDays + 1), 15, 0),
    acceptedAt: daysFromNow(-offsetDays, 11, 0),
    acceptedById: customer.userId ?? null,
    validUntil: daysFromNow(-(offsetDays + 1) + 15),
    notes: spec.quoteNotes ?? null,
  });

  const project = await prisma.project.create({
    data: {
      code: nextSeedCode('PRJ'),
      customerId: customer.id,
      quoteId: quote.id,
      status: 'AWAITING_ADVANCE',
      systemType: spec.systemType,
      capacityKw: money(spec.capacityKw),
      siteAddress: `${customer.addressLine}, ${customer.city} ${customer.pincode}`,
      subsidyEligible: spec.subsidyEligible,
      createdAt: daysFromNow(-offsetDays, 11, 5),
    },
  });

  return { lead, survey, quote, project, customer };
}

/**
 * Creates the dispatch and its pick list, exactly as the project.confirmed listener must
 * (BR-06): one DispatchLine per quote item.
 */
async function buildDispatch(prisma, { quote, project }, ctx, spec) {
  const items = await prisma.quoteItem.findMany({
    where: { quoteId: quote.id },
    include: { product: true },
  });

  // SERVICE lines are labour, not goods — they never go on a truck.
  const goods = items.filter((i) => i.product.category !== 'SERVICE');

  const dispatch = await prisma.dispatch.create({
    data: {
      number: nextSeedCode('DSP'),
      projectId: project.id,
      status: 'PENDING',
      createdAt: daysFromNow(-spec.daysAgo, 12, 0),
      lines: {
        create: goods.map((i) => ({
          productId: i.productId,
          requiredQty: i.quantity,
          scannedQty: '0',
          packedQty: '0',
        })),
      },
    },
    include: { lines: { include: { product: true } } },
  });

  return { dispatch, goods };
}

/**
 * Scans every serialized line and packs every non-serialized one, so the dispatch is
 * complete in the sense BR-07 requires.
 */
async function packDispatch(prisma, dispatch, project, ctx) {
  const assigned = [];

  for (const line of dispatch.lines) {
    const required = Number(line.requiredQty);

    if (line.product.isSerialized) {
      const units = take(ctx.serialsBySku, line.product.sku, required);
      await prisma.serialUnit.updateMany({
        where: { id: { in: units.map((u) => u.id) } },
        data: { status: 'RESERVED', projectId: project.id, dispatchId: dispatch.id },
      });
      await prisma.dispatchLine.update({
        where: { id: line.id },
        data: { scannedQty: money(required) },
      });
      assigned.push(...units.map((u) => ({ ...u, product: line.product })));
    } else {
      await prisma.dispatchLine.update({
        where: { id: line.id },
        data: { packedQty: money(required) },
      });
      // Non-serialized stock leaves the shelf when it is packed.
      await prisma.product.update({
        where: { id: line.productId },
        data: { stockQty: { decrement: Math.ceil(required) } },
      });
    }
  }

  await prisma.dispatch.update({
    where: { id: dispatch.id },
    data: { status: 'READY', packedById: ctx.staff.warehouse.id },
  });

  return assigned;
}

/**
 * Writes one Warranty row per delivered serial — BR-09, with the duration taken from the
 * product rather than from code, and the month arithmetic clamped so 31 Jan + 1 month
 * cannot roll into March.
 */
async function createWarranties(prisma, serials, { project, customer }, deliveredAt) {
  await prisma.warranty.createMany({
    data: serials.map((unit) => ({
      serialUnitId: unit.id,
      customerId: customer.id,
      projectId: project.id,
      startDate: deliveredAt,
      endDate: addMonths(deliveredAt, unit.product.warrantyMonths),
    })),
  });
}

/** An invoice built from the quote's own lines, so a reprint years later is identical. */
async function createInvoice(prisma, { quote, project, customer }, opts) {
  const items = await prisma.quoteItem.findMany({ where: { quoteId: quote.id } });

  const factor = opts.portion ?? 1;
  const lines = items.map((i) => ({
    description: i.description,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    taxPercent: i.taxPercent,
    lineTotal: money(Number(i.lineTotal) * factor),
  }));

  const subtotal = Number(quote.subtotal) * factor - Number(quote.discount) * factor;
  const taxTotal = Number(quote.taxTotal) * factor;

  return prisma.invoice.create({
    data: {
      number: nextSeedCode('INV'),
      customerId: customer.id,
      projectId: project.id,
      type: opts.type,
      status: opts.status,
      issueDate: opts.issueDate,
      dueDate: opts.dueDate ?? null,
      subtotal: money(subtotal),
      taxTotal: money(taxTotal),
      total: money(subtotal + taxTotal),
      amountPaid: money(opts.amountPaid ?? 0),
      notes: opts.notes ?? null,
      lines: { create: lines },
    },
  });
}

/**
 * Runs one project spec all the way to its stage.
 *
 * Flow: spine (lead -> survey -> quote -> project) -> payments -> confirm -> dispatch ->
 *       pack -> dispatch out -> deliver + warranties -> schedule -> install -> invoice.
 *       Each step is skipped once the spec's stage is reached.
 * Example:
 *   await buildProject(prisma, spec, ctx)
 *   // → { project, dispatch, serials, job }
 * Throws: Error from take() if a purchase quantity above is too small for the kit.
 */
async function buildProject(prisma, spec, ctx) {
  const stageIndex = STAGES.indexOf(spec.stage);
  const reached = (stage) => stageIndex >= STAGES.indexOf(stage);

  const spine = await buildSpine(prisma, spec, ctx);
  const { quote, project, customer } = spine;
  const { staff } = ctx;
  const total = Number(quote.total);
  const d = spec.daysAgo;

  // --- Advance payment ---
  const advance = spec.stage === 'AWAITING_ADVANCE'
    // Deliberately short of 30%, so the demo can show the BR-05 rejection on this project.
    ? Math.round(total * 0.1)
    : Math.round(total * 0.3);

  await prisma.payment.create({
    data: {
      projectId: project.id,
      customerId: customer.id,
      amount: money(advance),
      type: 'ADVANCE',
      mode: 'UPI',
      reference: `UPI/${String(400000 + Math.round(total % 100000))}`,
      receivedAt: daysFromNow(-(d - 1), 10, 30),
      recordedById: staff[spec.salesKey].id,
    },
  });

  if (!reached('CONFIRMED')) return { project };

  // --- Confirmed: proforma invoice, subsidy file, pick list, install job (BR-06) ---
  await prisma.project.update({
    where: { id: project.id },
    data: { status: 'CONFIRMED', confirmedAt: daysFromNow(-(d - 1), 12, 0) },
  });

  const proforma = await createInvoice(prisma, { quote, project, customer }, {
    type: 'PROFORMA',
    status: 'PARTIALLY_PAID',
    issueDate: daysFromNow(-(d - 1), 12, 5),
    dueDate: daysFromNow(-(d - 1) + 15),
    amountPaid: advance,
    notes: 'Proforma raised on order confirmation.',
  });

  await prisma.payment.updateMany({
    where: { projectId: project.id, invoiceId: null },
    data: { invoiceId: proforma.id },
  });

  if (spec.subsidyEligible) {
    await prisma.subsidyApplication.create({
      data: {
        projectId: project.id,
        scheme: 'PM Surya Ghar: Muft Bijli Yojana',
        status: spec.subsidyStatus ?? 'DOCUMENTS_PENDING',
        applicationRef: spec.subsidyRef ?? null,
        appliedAt: spec.subsidyAppliedAt ?? null,
        inspectionAt: spec.subsidyInspectionAt ?? null,
        approvedAt: spec.subsidyApprovedAt ?? null,
        disbursedAt: spec.subsidyDisbursedAt ?? null,
        amountExpected: money(spec.capacityKw <= 2 ? 60000 : 78000),
        amountReceived: spec.subsidyReceived ? money(spec.subsidyReceived) : null,
        remarks: spec.subsidyRemarks ?? null,
      },
    });
  }

  const { dispatch } = await buildDispatch(prisma, spine, ctx, spec);
  const job = await prisma.installationJob.create({
    data: { projectId: project.id, status: 'UNSCHEDULED' },
  });

  if (!reached('DISPATCHED')) return { project, dispatch, job };

  // --- Packed and dispatched ---
  const serials = await packDispatch(prisma, dispatch, project, ctx);

  const dispatchedAt = daysFromNow(-(d - 3), 9, 30);
  await prisma.serialUnit.updateMany({
    where: { dispatchId: dispatch.id },
    data: { status: 'DISPATCHED' },
  });
  await prisma.dispatch.update({
    where: { id: dispatch.id },
    data: {
      status: 'DISPATCHED',
      dispatchedAt,
      vehicleNo: spec.vehicleNo ?? 'TS 09 UB 4412',
      driverName: spec.driverName ?? 'Mallesh Goud',
      driverPhone: '9704411220',
    },
  });
  await prisma.project.update({ where: { id: project.id }, data: { status: 'DISPATCHED' } });

  if (!reached('DELIVERED')) return { project, dispatch, serials, job };

  // --- Delivered: the warranty clock starts by itself (BR-09) ---
  const deliveredAt = spec.deliveredAt ?? daysFromNow(-(d - 4), 11, 0);
  await prisma.serialUnit.updateMany({
    where: { dispatchId: dispatch.id },
    data: { status: 'DELIVERED' },
  });
  await prisma.dispatch.update({
    where: { id: dispatch.id },
    data: { status: 'DELIVERED', deliveredAt, receivedByName: customer.name },
  });
  await prisma.project.update({
    where: { id: project.id },
    data: { status: 'DELIVERED', deliveredAt },
  });
  await createWarranties(prisma, serials, spine, deliveredAt);

  if (!reached('INSTALLATION_SCHEDULED')) return { project, dispatch, serials, job };

  // --- Scheduled ---
  const scheduledDate = spec.scheduledDate ?? daysFromNow(-(d - 6));
  await prisma.installationJob.update({
    where: { id: job.id },
    data: {
      status: 'SCHEDULED',
      scheduledDate: dateOnly(scheduledDate),
      scheduledById: staff.warehouse.id,
      crew: {
        create: spec.crew.map((key, i) => ({
          technicianId: staff[key].id,
          isLead: i === 0,
        })),
      },
    },
  });
  await prisma.project.update({
    where: { id: project.id },
    data: { status: 'INSTALLATION_SCHEDULED' },
  });

  if (!reached('INSTALLED_UNPAID')) return { project, dispatch, serials, job };

  // --- Installed: BR-10's proof — times, capacity, photos, signature ---
  const startedAt = spec.installStartedAt ?? daysFromNow(-(d - 7), 9, 15);
  const finishedAt = spec.installFinishedAt ?? daysFromNow(-(d - 7), 16, 45);

  await prisma.installationJob.update({
    where: { id: job.id },
    data: {
      status: 'COMPLETED',
      startedAt,
      finishedAt,
      confirmedCapacityKw: money(spec.capacityKw),
      // A real system tests a little under its rated capacity.
      generationTestKw: money((spec.capacityKw * 0.9).toFixed(2)),
      checklist: CHECKLIST,
      customerSignatureUrl: `/uploads/placeholder-signature-${project.code.toLowerCase()}.png`,
      signedByName: customer.name,
      signedAt: finishedAt,
      remarks: spec.installRemarks ?? 'Generation verified with the customer present.',
    },
  });

  // Three photos, which is what BR-10 requires. These reference placeholder paths; the real
  // files arrive when a technician actually uploads them.
  await prisma.attachment.createMany({
    data: ['roof-array', 'inverter-wall', 'earthing-pit'].map((name, i) => ({
      entityType: 'INSTALLATION',
      entityId: job.id,
      fileUrl: `/uploads/placeholder-${project.code.toLowerCase()}-${name}.webp`,
      fileName: `${name}.webp`,
      mimeType: 'image/webp',
      sizeBytes: 180000 + i * 20000,
      kind: 'PHOTO',
      uploadedById: ctx.staff[spec.crew[0]].id,
    })),
  });

  await prisma.attachment.create({
    data: {
      entityType: 'INSTALLATION',
      entityId: job.id,
      fileUrl: `/uploads/placeholder-signature-${project.code.toLowerCase()}.png`,
      fileName: 'signature.png',
      mimeType: 'image/png',
      sizeBytes: 14200,
      kind: 'SIGNATURE',
      uploadedById: ctx.staff[spec.crew[0]].id,
    },
  });

  // One TimeLog per crew member — this is what labour cost (BR-13) and payouts read.
  await prisma.timeLog.createMany({
    data: spec.crew.map((key) => ({
      technicianId: staff[key].id,
      entityType: 'INSTALLATION',
      entityId: job.id,
      startedAt,
      endedAt: finishedAt,
      minutes: minutesBetween(startedAt, finishedAt),
      approved: true,
    })),
  });

  await prisma.project.update({
    where: { id: project.id },
    data: { status: 'INSTALLED', installedAt: finishedAt },
  });

  // --- Tax invoice for the balance ---
  const balance = total - advance;
  const taxInvoice = await prisma.invoice.create({
    data: {
      number: nextSeedCode('INV'),
      customerId: customer.id,
      projectId: project.id,
      type: 'TAX',
      status: spec.stage === 'INSTALLED_UNPAID' ? 'ISSUED' : 'PAID',
      issueDate: daysFromNow(-(d - 8), 10, 0),
      dueDate: daysFromNow(-(d - 8) + 10),
      subtotal: money(Number(quote.subtotal) - Number(quote.discount) - advance / 1.18),
      taxTotal: money(Number(quote.taxTotal) * (balance / total)),
      total: money(balance),
      amountPaid: money(spec.stage === 'INSTALLED_UNPAID' ? 0 : balance),
      notes: 'Balance payable on completion of installation.',
      lines: {
        create: [
          {
            description: `${spec.capacityKw} kW ${spec.systemType === 'ON_GRID' ? 'On-Grid' : 'Off-Grid'} rooftop system — balance on completion`,
            quantity: '1.00',
            unitPrice: money(balance / 1.18),
            taxPercent: '18.00',
            lineTotal: money(balance / 1.18),
          },
        ],
      },
    },
  });

  // --- Project expenses: the fourth term of BR-13 ---
  await prisma.expense.createMany({
    data: (spec.expenses ?? [{ category: 'TRANSPORT', amount: 2400, description: 'Tempo hire for panel delivery' }]).map(
      (e) => ({
        projectId: project.id,
        category: e.category,
        amount: money(e.amount),
        description: e.description,
        spentAt: daysFromNow(-(d - 5), 14, 0),
        createdById: staff.warehouse.id,
      }),
    ),
  });

  if (spec.stage === 'INSTALLED_UNPAID' || spec.stage === 'INSTALLED_LOSS') {
    return { project, dispatch, serials, job, taxInvoice };
  }

  // --- Closed: the balance is paid and the subsidy is settled ---
  await prisma.payment.create({
    data: {
      projectId: project.id,
      invoiceId: taxInvoice.id,
      customerId: customer.id,
      amount: money(balance),
      type: 'FINAL',
      mode: 'BANK_TRANSFER',
      reference: `NEFT/${String(770000 + Math.round(balance % 100000))}`,
      receivedAt: daysFromNow(-(d - 10), 15, 0),
      recordedById: staff[spec.salesKey].id,
    },
  });

  await prisma.project.update({
    where: { id: project.id },
    data: { status: 'CLOSED', closedAt: daysFromNow(-(d - 12), 17, 0) },
  });

  return { project, dispatch, serials, job, taxInvoice };
}

/** The ten specs. Each one exists for a reason named in its comment. */
function specs() {
  return [
    // 1. The Scene E system: delivered 18 months ago, inverter warranty still ACTIVE.
    {
      key: 'vipul', customer: 'vipul', stage: 'CLOSED', capacityKw: 3, systemType: 'ON_GRID',
      daysAgo: 560, salesKey: 'sales1', surveyKey: 'survey1', crew: ['install1', 'install2'],
      subsidyEligible: true, subsidyStatus: 'DISBURSED',
      subsidyRef: 'PMSG/TS/2025/114872', subsidyAppliedAt: daysFromNow(-545),
      subsidyInspectionAt: daysFromNow(-530), subsidyApprovedAt: daysFromNow(-520),
      subsidyDisbursedAt: daysFromNow(-500), subsidyReceived: 78000,
      roofAreaSqft: 520, monthlyBillInr: 4200,
      deliveredAt: daysFromNow(-548, 11, 0),
      qualificationNotes: 'South-facing RCC terrace in Kukatpally. Clear of the water tank.',
      surveyNotes: 'Ideal roof. Inverter mounted in the stair room, 18 m cable run.',
      expenses: [{ category: 'TRANSPORT', amount: 2600, description: 'Tempo hire, Cherlapally to Kukatpally' }],
    },
    // 2. The BR-11 chargeable branch: delivered 27 months ago, inverter warranty EXPIRED.
    {
      key: 'srinivas', customer: 'srinivas', stage: 'CLOSED', capacityKw: 4, systemType: 'ON_GRID',
      daysAgo: 835, salesKey: 'sales2', surveyKey: 'survey2', crew: ['install1', 'install3'],
      subsidyEligible: false,
      roofAreaSqft: 900, monthlyBillInr: 9800, roofDirection: 'SE', cableDistanceMeters: 34,
      deliveredAt: daysFromNow(-822, 10, 30),
      qualificationNotes: 'Commercial shed roof at Gachibowli. Three-phase connection.',
      surveyNotes: 'Metal sheet roof, purlin spacing suits standard rails. Long cable run.',
      roofType: 'METAL_SHEET',
      expenses: [
        { category: 'TRANSPORT', amount: 3800, description: 'Two trips, panels and structure' },
        { category: 'LABOUR_EXTRA', amount: 4500, description: 'Extra day for the long DC run' },
      ],
    },
    // 3. The loss-maker for the director's demo: heavy discount plus unplanned civil work.
    {
      key: 'anitha', customer: 'anitha', stage: 'INSTALLED_LOSS', capacityKw: 3, systemType: 'ON_GRID',
      daysAgo: 48, salesKey: 'sales2', surveyKey: 'survey2', crew: ['install2', 'install4'],
      subsidyEligible: true, subsidyStatus: 'APPLIED',
      subsidyRef: 'PMSG/TS/2026/228441', subsidyAppliedAt: daysFromNow(-30),
      discount: 22000,
      roofAreaSqft: 480, monthlyBillInr: 3900,
      qualificationNotes: 'Price-sensitive. Matched a competitor quote to win the job.',
      surveyNotes: 'Parapet needed raising before the structure could be anchored.',
      quoteNotes: 'Discount approved by the director to match a competing quote.',
      installRemarks: 'Civil work for the parapet took an extra day.',
      expenses: [
        { category: 'CIVIL_WORK', amount: 18500, description: 'Parapet raising and waterproofing, not in the quote' },
        { category: 'TRANSPORT', amount: 3200, description: 'Three trips because of the civil work delay' },
        { category: 'LABOUR_EXTRA', amount: 6800, description: 'Extra crew day' },
      ],
    },
    // 4. Installed but not yet paid — the director's "invoiced not paid" row.
    {
      key: 'gopal', customer: 'gopal', stage: 'INSTALLED_UNPAID', capacityKw: 2, systemType: 'ON_GRID',
      daysAgo: 22, salesKey: 'sales1', surveyKey: 'survey1', crew: ['install1', 'install4'],
      subsidyEligible: true, subsidyStatus: 'DOCUMENTS_PENDING',
      roofAreaSqft: 360, monthlyBillInr: 2800,
      qualificationNotes: 'Retired couple, modest consumption. Keen on the subsidy.',
      surveyNotes: 'Small clear terrace, short cable run.',
    },
    // 5. Scheduled, crew assigned, not yet started.
    {
      key: 'nagaraju', customer: 'nagaraju', stage: 'INSTALLATION_SCHEDULED', capacityKw: 5, systemType: 'ON_GRID',
      daysAgo: 14, salesKey: 'sales2', surveyKey: 'survey2', crew: ['install1', 'install2', 'install3'],
      subsidyEligible: false,
      roofAreaSqft: 1100, monthlyBillInr: 14500, roofType: 'METAL_SHEET', roofDirection: 'S',
      scheduledDate: daysFromNow(2),
      qualificationNotes: 'Textile unit, runs looms through the day. Wants to cut the day-time bill.',
      surveyNotes: 'Large shed roof, plenty of space. Three-phase 8 kW sanctioned.',
    },
    // 6. Delivered, warranties running, waiting for the warehouse to schedule the crew.
    {
      key: 'swapna', customer: 'swapna', stage: 'DELIVERED', capacityKw: 3, systemType: 'OFF_GRID',
      daysAgo: 10, salesKey: 'sales1', surveyKey: 'survey1', crew: ['install2', 'install4'],
      subsidyEligible: false,
      roofAreaSqft: 540, monthlyBillInr: 5100,
      qualificationNotes: 'Area has long evening outages. Battery backup is the main reason to buy.',
      surveyNotes: 'RCC terrace. Battery bank to go in the utility room on the ground floor.',
    },
    // 7. On the truck — the customer-facing "dispatched" state.
    {
      key: 'fatima', customer: 'fatima', stage: 'DISPATCHED', capacityKw: 5, systemType: 'OFF_GRID',
      daysAgo: 6, salesKey: 'sales1', surveyKey: 'survey2', crew: ['install1', 'install3'],
      subsidyEligible: false,
      roofAreaSqft: 820, monthlyBillInr: 8600,
      vehicleNo: 'TS 07 UC 9031', driverName: 'Shaik Nazeer',
      qualificationNotes: 'Large family home, frequent outages. Wants the full battery bank.',
      surveyNotes: 'Two-level terrace, panels on the upper level. Hybrid inverter in the garage.',
    },
    // 8. Confirmed, pick list waiting — the warehouse's first screen has work on it.
    {
      key: 'iqbal', customer: 'iqbal', stage: 'CONFIRMED', capacityKw: 2, systemType: 'ON_GRID',
      daysAgo: 3, salesKey: 'sales2', surveyKey: 'survey1', crew: ['install4'],
      subsidyEligible: true, subsidyStatus: 'DOCUMENTS_PENDING',
      roofAreaSqft: 340, monthlyBillInr: 2600,
      qualificationNotes: 'Old city, narrow access. Material will need a smaller vehicle.',
      surveyNotes: 'Tiled roof with an RCC section. Panels on the RCC part only.',
      roofType: 'TILED',
    },
    // 9. A second confirmed job, so the packing queue is not a single row.
    {
      key: 'rohini', customer: 'rohini', stage: 'CONFIRMED', capacityKw: 4, systemType: 'ON_GRID',
      daysAgo: 2, salesKey: 'sales1', surveyKey: 'survey2', crew: ['install2', 'install3'],
      subsidyEligible: true, subsidyStatus: 'NOT_STARTED',
      roofAreaSqft: 700, monthlyBillInr: 6400,
      qualificationNotes: 'Duplex in Kothapet. Decided quickly after the survey.',
      surveyNotes: 'Flat RCC roof, unobstructed. Short cable run to the meter board.',
    },
    // 10. Awaiting advance, deliberately under-paid so the BR-05 rejection can be demonstrated.
    {
      key: 'harpreet', customer: 'harpreet', stage: 'AWAITING_ADVANCE', capacityKw: 2, systemType: 'ON_GRID',
      daysAgo: 1, salesKey: 'sales1', surveyKey: 'survey1', crew: ['install4'],
      subsidyEligible: true,
      roofAreaSqft: 320, monthlyBillInr: 2400,
      qualificationNotes: 'Accepted the quote, has paid a token amount so far.',
      surveyNotes: 'Secunderabad flat, terrace rights confirmed in writing.',
    },
  ];
}

/**
 * Creates the extra customers and then every project.
 *
 * Example:
 *   const { projects } = await seedProjects(prisma, ctx)
 *   // → projects.vipul.project.code === "PRJ-2026-0001"
 * Throws: Error from take() when seeded stock is too low for the kits.
 */
export async function seedProjects(prisma, ctx) {
  for (const { key, ...data } of EXTRA_CUSTOMERS) {
    ctx.customers[key] = await prisma.customer.create({ data });
  }

  const projects = {};
  for (const spec of specs()) {
    projects[spec.key] = await buildProject(prisma, spec, ctx);
  }

  return { projects };
}
