import { onEvent } from '../../core/events.js';
import { notifyUsers, notifyRole } from '../../core/notify.js';
import { prisma } from '../../core/prisma.js';

/**
 * Quotes event listeners — Member B.
 *
 * quote.sent     → notify customer to review and accept.
 * quote.accepted → notify assigned sales executive + director.
 */
export default function register() {
  onEvent('quote.sent', async ({ quoteId }) => {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      select: {
        number: true,
        total: true,
        customer: { select: { id: true, userId: true, name: true } },
        lead: { select: { assignedToId: true } },
      },
    });
    if (!quote) return;

    if (quote.customer?.userId) {
      await notifyUsers([quote.customer.userId], {
        title: `Quote ${quote.number} ready for review`,
        body: `Your solar system quote is ready. Please review and accept to proceed.`,
        link: `/portal/quotes/${quoteId}`,
      });
    }

    if (quote.lead?.assignedToId) {
      await notifyUsers([quote.lead.assignedToId], {
        title: `Quote ${quote.number} sent`,
        body: `Quote sent to ${quote.customer?.name ?? 'customer'}.`,
        link: `/sales/quotes/${quoteId}`,
      });
    }
  });

  onEvent('quote.accepted', async ({ quoteId }) => {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      select: {
        number: true,
        customer: { select: { name: true } },
        lead: { select: { assignedToId: true } },
      },
    });
    if (!quote) return;

    const title = `Quote ${quote.number} accepted — ${quote.customer?.name ?? ''}`;
    const body = 'A project will now be created. Confirm the advance payment to proceed.';

    if (quote.lead?.assignedToId) {
      await notifyUsers([quote.lead.assignedToId], { title, body, link: `/sales/quotes/${quoteId}` });
    }
    await notifyRole('DIRECTOR', { title, body, link: `/sales/quotes/${quoteId}` });
  });
}
