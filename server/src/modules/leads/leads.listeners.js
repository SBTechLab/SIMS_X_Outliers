import { onEvent } from '../../core/events.js';
import { notifyUsers, notifyRole } from '../../core/notify.js';
import { prisma } from '../../core/prisma.js';

/**
 * Leads event listeners — Member B.
 *
 * lead.created  → notify the assigned sales executive (or all if unassigned).
 * lead.assigned → notify the newly assigned executive.
 */
export default function register() {
  onEvent('lead.created', async ({ leadId }) => {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { code: true, name: true, city: true, assignedToId: true },
    });
    if (!lead) return;

    const title = `New enquiry ${lead.code} — ${lead.name}`;
    const body = lead.city ? `From ${lead.city}` : null;
    const link = `/sales/leads/${leadId}`;

    if (lead.assignedToId) {
      await notifyUsers([lead.assignedToId], { title, body, link });
    } else {
      await notifyRole('SALES_EXECUTIVE', { title, body, link });
    }
  });

  onEvent('lead.assigned', async ({ leadId, assignedToId, code, name }) => {
    await notifyUsers([assignedToId], {
      title: `${code} assigned to you`,
      body: name,
      link: `/sales/leads/${leadId}`,
    });
  });
}
