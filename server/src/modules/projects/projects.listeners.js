import { onEvent } from '../../core/events.js';
import { notifyRole } from '../../core/notify.js';
import { notifyUsers } from '../../core/notify.js';
import { prisma } from '../../core/prisma.js';
import { createProjectFromQuote } from './projects.service.js';

/**
 * Projects event listeners — Member B.
 *
 * quote.accepted   → auto-create the project.
 * project.created  → notify director and sales.
 * project.confirmed → notify warehouse to begin packing.
 */
export default function register() {
  onEvent('quote.accepted', async ({ quoteId }) => {
    await createProjectFromQuote(quoteId);
  });

  onEvent('project.created', async ({ projectId }) => {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { code: true, customer: { select: { name: true } }, quote: { select: { total: true } } },
    });
    if (!project) return;
    await notifyRole('DIRECTOR', {
      title: `Project ${project.code} created`,
      body: `${project.customer.name} — advance payment awaited.`,
      link: `/sales/projects/${projectId}`,
    });
  });

  onEvent('project.confirmed', async ({ projectId }) => {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { code: true, customer: { select: { name: true } } },
    });
    if (!project) return;
    await notifyRole('WAREHOUSE_MANAGER', {
      title: `${project.code} confirmed — begin packing`,
      body: `${project.customer.name} — advance received, project is confirmed.`,
      link: `/warehouse/projects/${projectId}`,
    });
  });
}
