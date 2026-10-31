import { prisma } from '../core/prisma.js';
import { notifyUsers, notifyRole } from '../core/notify.js';

/** BR-02 — 24 hours with no logged contact. */
const OVERDUE_HOURS = 24;

/**
 * Notifies about leads that have gone uncontacted for 24 hours.
 *
 * Why: BR-02 — a lead with no contact logged for 24h is overdue. The flag itself is derived
 *      at read time (D-11) so the board is never stale; this job exists only to push a
 *      reminder at someone, which is what actually stops an enquiry going cold.
 * Flow: find NEW/CONTACTED leads with firstContactedAt null and createdAt older than 24h ->
 *       notify the assignee, or all of sales when nobody owns it.
 * Example:
 *   await flagOverdueLeads()
 *   // → { overdue: 2, notified: 2 }
 * Throws: nothing of its own.
 */
export async function flagOverdueLeads() {
  const cutoff = new Date(Date.now() - OVERDUE_HOURS * 60 * 60 * 1000);

  const leads = await prisma.lead.findMany({
    where: {
      status: { in: ['NEW', 'CONTACTED'] },
      firstContactedAt: null,
      createdAt: { lt: cutoff },
    },
    select: { id: true, code: true, name: true, city: true, assignedToId: true },
  });

  let notified = 0;

  for (const lead of leads) {
    const payload = {
      title: `${lead.code} has not been contacted`,
      body: `${lead.name}${lead.city ? `, ${lead.city}` : ''} — no call logged in ${OVERDUE_HOURS} hours.`,
      link: `/sales/leads/${lead.id}`,
    };

    // An unassigned overdue lead is everyone's problem, so it goes to the whole desk.
    const result = lead.assignedToId
      ? await notifyUsers([lead.assignedToId], payload)
      : await notifyRole('SALES_EXECUTIVE', payload);

    notified += result.created;
  }

  return { overdue: leads.length, notified };
}
