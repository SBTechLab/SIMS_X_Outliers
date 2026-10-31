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
 * Creates a lead from the public enquiry form.
 *
 * Why: this is the one unauthenticated write in the system. BR-01 — a repeat phone number is
 *      flagged and linked via duplicateOfId, never rejected, so an enquiry can never vanish.
 * Flow: inside a transaction, look up the earliest matching lead by phone -> generate the
 *       code -> create the lead -> emit lead.created after the commit.
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
        duplicateOfId: original?.id ?? null,
      },
      select: { id: true, code: true },
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
