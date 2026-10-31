import { onEvent } from '../../core/events.js';
import { prisma } from '../../core/prisma.js';
import { notifyRole, notifyUsers } from '../../core/notify.js';
import { logger } from '../../core/logger.js';

/**
 * Installation event listeners — Member C.
 *
 * project.confirmed        → create unscheduled InstallationJob (BR-06).
 * installation.scheduled   → notify crew + customer.
 * installation.completed   → update project status to INSTALLED.
 */
export default function register() {
  onEvent('project.confirmed', async ({ projectId }) => {
    const existing = await prisma.installationJob.findUnique({ where: { projectId } });
    if (existing) {
      logger.warn({ projectId }, 'installation job already exists — skipping');
      return;
    }

    const job = await prisma.installationJob.create({
      data: { projectId, status: 'UNSCHEDULED' },
    });

    logger.info({ jobId: job.id, projectId }, 'installation job created from project.confirmed');
  });

  onEvent('installation.scheduled', async ({ jobId, projectId }) => {
    const job = await prisma.installationJob.findUnique({
      where: { id: jobId },
      include: {
        crew: { select: { technicianId: true } },
        project: {
          select: {
            code: true,
            customer: { include: { user: { select: { id: true } } } },
          },
        },
      },
    });
    if (!job) return;

    const techIds = job.crew.map((c) => c.technicianId);
    if (techIds.length > 0) {
      await notifyUsers(techIds, {
        title: `Installation scheduled — ${job.project.code}`,
        body: `Scheduled for ${job.scheduledDate?.toLocaleDateString('en-IN') ?? 'TBD'}.`,
        link: `/field/jobs/${jobId}`,
      });
    }

    if (job.project?.customer?.user) {
      await notifyUsers([job.project.customer.user.id], {
        title: 'Installation date confirmed',
        body: `Your solar installation for ${job.project.code} has been scheduled.`,
        link: `/portal/projects`,
      });
    }
  });

  onEvent('installation.completed', async ({ jobId, projectId }) => {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'INSTALLED' },
    });

    await notifyRole('DIRECTOR', {
      title: 'Installation complete',
      body: `Project installation finished — awaiting final invoice.`,
      link: `/director/projects/${projectId}`,
    });

    logger.info({ jobId, projectId }, 'project marked INSTALLED after installation.completed');
  });
}
