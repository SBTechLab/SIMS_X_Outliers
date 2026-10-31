import { onEvent } from '../../core/events.js';
import { prisma } from '../../core/prisma.js';
import { notifyRole, notifyUsers } from '../../core/notify.js';

/**
 * Ticket event listeners — Member C.
 *
 * ticket.created  → notify SUPPORT_EXECUTIVE role.
 * ticket.closed   → notify the customer who raised it.
 */
export default function register() {
  onEvent('ticket.created', async ({ ticketId }) => {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { number: true, subject: true },
    });
    if (!ticket) return;

    await notifyRole('SUPPORT_EXECUTIVE', {
      title: `New ticket ${ticket.number}`,
      body: ticket.subject,
      link: `/support/tickets/${ticketId}`,
    });
  });

  onEvent('ticket.closed', async ({ ticketId }) => {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        customer: { include: { user: { select: { id: true } } } },
      },
    });
    if (!ticket?.customer?.user) return;

    await notifyUsers([ticket.customer.user.id], {
      title: `Ticket ${ticket.number} resolved`,
      body: 'Your support ticket has been resolved. Please confirm if the issue is fixed.',
      link: `/portal/tickets/${ticketId}`,
    });
  });
}
