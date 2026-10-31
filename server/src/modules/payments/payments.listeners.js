import { onEvent } from '../../core/events.js';
import { notifyUsers } from '../../core/notify.js';
import { prisma } from '../../core/prisma.js';

/**
 * Payments event listeners — Member B.
 *
 * payment.recorded → notify DIRECTOR if advance pushes project to confirmable state.
 */
export default function register() {
  onEvent('payment.recorded', async ({ projectId }) => {
    if (!projectId) return;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true, code: true, status: true,
        quote: { select: { assignedToId: true } },
      },
    });
    if (!project || project.status !== 'AWAITING_ADVANCE') return;

    const lead = await prisma.lead.findFirst({
      where: { quotes: { some: { projectId: project.id } } },
      select: { assignedToId: true },
    });
    if (!lead?.assignedToId) return;

    await notifyUsers([lead.assignedToId], {
      title: `Payment received for ${project.code}`,
      body: 'Check if the advance threshold is met and confirm the project.',
      link: `/sales/projects/${project.id}`,
    });
  });
}
