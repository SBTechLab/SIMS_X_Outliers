import { onEvent } from '../../core/events.js';
import { prisma } from '../../core/prisma.js';
import { nextCode } from '../../core/codes.js';
import { notifyRole, notifyUsers } from '../../core/notify.js';
import { logger } from '../../core/logger.js';

/**
 * Dispatch event listeners — Member C.
 *
 * project.confirmed   → create Dispatch + DispatchLines from quote items (BR-06).
 * dispatch.dispatched → notify the customer with vehicle details.
 * dispatch.delivered  → notify the installation crew.
 */
export default function register() {
  onEvent('project.confirmed', async ({ projectId }) => {
    const existing = await prisma.dispatch.findUnique({ where: { projectId } });
    if (existing) {
      logger.warn({ projectId }, 'dispatch already exists for project — skipping');
      return;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        quote: {
          include: {
            items: {
              include: { product: { select: { id: true, isSerialized: true } } },
            },
          },
        },
        customer: { select: { name: true } },
      },
    });
    if (!project?.quote) return;

    await prisma.$transaction(async (tx) => {
      const number = await nextCode('DSP', tx);

      const dispatch = await tx.dispatch.create({
        data: {
          number,
          projectId,
          status: 'PENDING',
        },
      });

      for (const item of project.quote.items) {
        await tx.dispatchLine.create({
          data: {
            dispatchId: dispatch.id,
            productId: item.productId,
            requiredQty: item.quantity,
            scannedQty: 0,
            packedQty: 0,
          },
        });
      }

      logger.info({ dispatchId: dispatch.id, number, projectId }, 'dispatch created from project.confirmed');
    });
  });

  onEvent('dispatch.dispatched', async ({ dispatchId, projectId }) => {
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: dispatchId },
      include: {
        project: {
          include: { customer: { include: { user: { select: { id: true } } } } },
        },
      },
    });
    if (!dispatch?.project?.customer?.user) return;

    await notifyUsers([dispatch.project.customer.user.id], {
      title: `Your order ${dispatch.project.code} is on the way`,
      body: `Vehicle ${dispatch.vehicleNo ?? ''}, driver ${dispatch.driverName ?? ''}.`,
      link: `/portal/projects`,
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'DISPATCHED' },
    });
  });

  onEvent('dispatch.delivered', async ({ dispatchId, projectId }) => {
    const job = await prisma.installationJob.findUnique({ where: { projectId } });
    if (job) {
      const crew = await prisma.installationCrew.findMany({
        where: { jobId: job.id },
        select: { technicianId: true },
      });
      if (crew.length > 0) {
        await notifyUsers(
          crew.map((c) => c.technicianId),
          {
            title: 'Delivery complete — installation can be scheduled',
            body: `Project has been delivered. Await scheduling.`,
            link: `/field/jobs`,
          },
        );
      }
    }

    await notifyRole('WAREHOUSE_MANAGER', {
      title: 'Delivery recorded',
      body: `Dispatch for project delivered. Schedule installation.`,
      link: `/warehouse/installations`,
    });
  });
}
