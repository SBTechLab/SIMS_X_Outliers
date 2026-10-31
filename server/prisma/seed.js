import { PrismaClient } from '@prisma/client';
import { counterRows } from './seed/helpers.js';
import { DEMO_PASSWORD, seedUsersAndSettings } from './seed/users.js';
import { seedCatalog } from './seed/catalog.js';
import { seedProcurement } from './seed/procurement.js';
import { counters, seedStandaloneFunnel } from './seed/funnel.js';
import { seedProjects } from './seed/projects.js';
import { seedService } from './seed/service.js';

const prisma = new PrismaClient();

/**
 * Deletes everything, in foreign-key-safe order.
 *
 * Why: the seed must be idempotent so `npm run seed` can be run repeatedly during the
 *      hackathon without a database reset (docs/DATABASE.md section 7). Order matters —
 *      most relations are onDelete: Restrict, so children go first.
 */
async function reset() {
  // Children before parents, and the polymorphic tables before everything they point at.
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.shareLink.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.timeLog.deleteMany();
  await prisma.payout.deleteMany();

  await prisma.payment.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.expense.deleteMany();

  await prisma.ticketPart.deleteMany();
  await prisma.ticketActivity.deleteMany();
  await prisma.ticket.deleteMany();

  await prisma.warranty.deleteMany();
  await prisma.installationCrew.deleteMany();
  await prisma.installationJob.deleteMany();
  await prisma.subsidyApplication.deleteMany();

  await prisma.dispatchLine.deleteMany();
  // A serial points at both a project and a dispatch, so clear those links before the
  // parents go, or the Restrict rules refuse the delete.
  await prisma.serialUnit.updateMany({ data: { projectId: null, dispatchId: null, replacedById: null } });
  await prisma.dispatch.deleteMany();

  await prisma.project.deleteMany();
  await prisma.quoteItem.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.survey.deleteMany();
  await prisma.leadActivity.deleteMany();
  // Leads self-reference through duplicateOfId, so break the links first.
  await prisma.lead.updateMany({ data: { duplicateOfId: null, customerId: null } });
  await prisma.lead.deleteMany();

  await prisma.serialUnit.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.supplier.deleteMany();

  await prisma.kitTemplateItem.deleteMany();
  await prisma.kitTemplate.deleteMany();
  await prisma.product.deleteMany();

  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.counter.deleteMany();
}

async function main() {
  const started = Date.now();
  console.log('Resetting the database...');
  await reset();

  console.log('Users, customers and settings...');
  const { staff, customers } = await seedUsersAndSettings(prisma);

  console.log('Products and kit templates...');
  const { products, kits } = await seedCatalog(prisma);

  console.log('Suppliers, purchases and serial units...');
  const { serialsBySku } = await seedProcurement(prisma, products, staff.warehouse);

  const ctx = { staff, customers, products, kits, serialsBySku };

  console.log('Leads, surveys and quotes...');
  await seedStandaloneFunnel(prisma, ctx);

  console.log('Projects across every stage...');
  const { projects } = await seedProjects(prisma, ctx);

  console.log('Tickets, payouts, notifications and audit log...');
  await seedService(prisma, ctx, projects);

  // The running app continues the seed's numbering, so no code is ever reused (BR-17).
  console.log('Counters...');
  await prisma.counter.createMany({ data: counterRows(counters) });

  const counts = {
    users: await prisma.user.count(),
    customers: await prisma.customer.count(),
    products: await prisma.product.count(),
    kitTemplates: await prisma.kitTemplate.count(),
    serialUnits: await prisma.serialUnit.count(),
    inStock: await prisma.serialUnit.count({ where: { status: 'IN_STOCK' } }),
    leads: await prisma.lead.count(),
    surveys: await prisma.survey.count(),
    quotes: await prisma.quote.count(),
    projects: await prisma.project.count(),
    dispatches: await prisma.dispatch.count(),
    warranties: await prisma.warranty.count(),
    installations: await prisma.installationJob.count(),
    invoices: await prisma.invoice.count(),
    payments: await prisma.payment.count(),
    tickets: await prisma.ticket.count(),
    subsidies: await prisma.subsidyApplication.count(),
    expenses: await prisma.expense.count(),
    timeLogs: await prisma.timeLog.count(),
    payouts: await prisma.payout.count(),
    notifications: await prisma.notification.count(),
    auditLogs: await prisma.auditLog.count(),
  };

  console.log('\nSeed complete in ' + ((Date.now() - started) / 1000).toFixed(1) + 's\n');
  for (const [key, value] of Object.entries(counts)) {
    console.log(`  ${key.padEnd(16)} ${value}`);
  }

  const activeWarranties = await prisma.warranty.count({
    where: { endDate: { gte: new Date() }, voidReason: null },
  });
  console.log(`  ${'activeWarranty'.padEnd(16)} ${activeWarranties}`);

  console.log(`\n  Every account uses the password: ${DEMO_PASSWORD}`);
  console.log('  Staff sign in by email (admin@sunpower.in, sales1@sunpower.in, ...).');
  console.log('  Customers sign in by phone (9848012345 = Vipul Mehta).');
  console.log('  See docs/DATABASE.md section 8 for the full account list.\n');
}

main()
  .catch((err) => {
    console.error('\nSeed failed:\n', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
