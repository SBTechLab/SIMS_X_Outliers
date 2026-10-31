import { prisma } from '../../core/prisma.js';
import { AppError } from '../../core/AppError.js';
import { emitEvent } from '../../core/events.js';
import { nextCode } from '../../core/codes.js';
import { toMoneyString } from '../../core/money.js';

/**
 * The minimum public endpoints the landing page and the enquiry form need (Member B).
 *
 * Member B owns this module; this baseline exists so the public site renders from day one
 * and the demo's opening "submit the enquiry form" scene works. B extends it with the full
 * contract from docs/API_CONTRACTS.md.
 */

/** Active kit templates for the pricing page. No cost prices, no BOM. */
export async function listPackages() {
  const kits = await prisma.kitTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ systemType: 'asc' }, { capacityKw: 'asc' }],
    select: {
      id: true,
      name: true,
      systemType: true,
      capacityKw: true,
      description: true,
      basePrice: true,
    },
  });

  return kits.map((k) => ({
    ...k,
    capacityKw: Number(k.capacityKw).toFixed(2),
    basePrice: toMoneyString(k.basePrice),
  }));
}

/** Real counts for the hero. */
export async function getStats() {
  const [projectsCompleted, installedWithCapacity, customersServed] = await Promise.all([
    prisma.project.count({ where: { status: { in: ['INSTALLED', 'CLOSED'] } } }),
    prisma.project.aggregate({
      where: { status: { in: ['INSTALLED', 'CLOSED'] } },
      _sum: { capacityKw: true },
    }),
    prisma.customer.count(),
  ]);

  return {
    projectsCompleted,
    kwInstalled: toMoneyString(installedWithCapacity._sum.capacityKw ?? 0),
    customersServed,
    yearsActive: 6,
  };
}

/**
 * Picks the active SALES_EXECUTIVE with the fewest open (non-LOST) leads.
 *
 * Why: BR-15 round-robin — new web-form leads are distributed evenly so no single
 *      executive accumulates backlog while others sit idle.
 * Flow: count non-LOST leads per active SALES_EXECUTIVE -> return the id with the lowest
 *       count. Falls back to null when no executives exist (prevents a crash during setup).
 * Throws: nothing — absence of executives is silently tolerated.
 */
async function pickRoundRobinAssignee(tx) {
  const executives = await tx.user.findMany({
    where: { role: 'SALES_EXECUTIVE', isActive: true },
    select: { id: true },
  });
  if (executives.length === 0) return null;

  const counts = await tx.lead.groupBy({
    by: ['assignedToId'],
    where: {
      assignedToId: { in: executives.map((e) => e.id) },
      status: { not: 'LOST' },
    },
    _count: { id: true },
  });

  const tally = new Map(executives.map((e) => [e.id, 0]));
  for (const row of counts) {
    if (row.assignedToId) tally.set(row.assignedToId, row._count.id);
  }

  let minCount = Infinity;
  let chosen = executives[0].id;
  for (const [id, count] of tally) {
    if (count < minCount) { minCount = count; chosen = id; }
  }
  return chosen;
}

/**
 * Creates a lead from the public enquiry form.
 *
 * Why: this is the one unauthenticated write in the system. BR-01 — a repeat phone number is
 *      flagged and linked via duplicateOfId, never rejected, so an enquiry can never vanish.
 *      BR-15 — the lead is round-robin assigned to the SALES_EXECUTIVE with fewest open leads.
 * Flow: inside a transaction, look up the earliest matching lead by phone -> pick the least-
 *       loaded sales executive -> generate the code -> create the lead -> emit lead.created
 *       after the commit.
 * Example:
 *   await createPublicEnquiry({ name: "Ramesh Yadav", phone: "9701234567", ... })
 *   // → { code: "ENQ-2026-0042" }
 * Throws: AppError 422 VALIDATION_ERROR, already handled by zod in validation.js.
 */
export async function createPublicEnquiry(data) {
  const lead = await prisma.$transaction(async (tx) => {
    const original = await tx.lead.findFirst({
      where: { phone: data.phone },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    const assignedToId = await pickRoundRobinAssignee(tx);
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
        source: 'WEB_FORM',
        requestedSystemType: data.requestedSystemType ?? 'NOT_SURE',
        requestedCapacityKw: data.requestedCapacityKw != null ? String(data.requestedCapacityKw) : null,
        wantsSubsidy: data.wantsSubsidy ?? false,
        status: 'NEW',
        assignedToId,
        duplicateOfId: original?.id ?? null,
      },
      select: { id: true, code: true, assignedToId: true },
    });
  });

  emitEvent('lead.created', { leadId: lead.id });

  return { code: lead.code };
}

/**
 * Opens a shared report by its random token.
 *
 * Why: US-F5 — the director shares a read-only report URL that works with no login.
 *      The implementation of the report payload lives in the reports module (Member A); this
 *      endpoint only validates the token and hands the request on.
 * Throws: AppError 404 NOT_FOUND for an unknown OR expired token — the same error either way,
 *         so the token cannot be probed (SECURITY.md section 11).
 */
export async function openSharedReport(token) {
  const link = await prisma.shareLink.findUnique({ where: { token } });

  if (!link || link.expiresAt < new Date()) {
    throw new AppError(404, 'NOT_FOUND', 'This link is no longer available.');
  }

  // Member A fills in the real report payload — until then the client sees a stub.
  return { type: link.type, params: link.params, expiresAt: link.expiresAt };
}
