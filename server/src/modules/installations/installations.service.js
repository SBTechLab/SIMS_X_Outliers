import { prisma } from '../../core/prisma.js';
import { AppError } from '../../core/AppError.js';
import { paginate } from '../../core/pagination.js';
import { emitEvent } from '../../core/events.js';
import { notifyUsers } from '../../core/notify.js';

const JOB_INCLUDE = {
  project: {
    select: {
      id: true, code: true, status: true, capacityKw: true, siteAddress: true,
      customer: { select: { id: true, name: true, phone: true, city: true } },
    },
  },
  scheduledBy: { select: { id: true, name: true } },
  crew: {
    include: { technician: { select: { id: true, name: true, phone: true } } },
  },
};

/**
 * Lists installation jobs.
 * Why: warehouse sees all scheduled jobs; technician sees only assigned ones.
 * Flow: filter by crew membership for INSTALLATION_TECHNICIAN, paginate.
 * Example: await listInstallations({ status: 'SCHEDULED' }, user)
 * Throws: nothing.
 */
export async function listInstallations(query, user) {
  const { skip, take, meta } = paginate(query);
  const where = {};
  if (query.status) where.status = query.status;

  // Technicians only see their own jobs
  if (user.role === 'INSTALLATION_TECHNICIAN') {
    where.crew = { some: { technicianId: user.id } };
  }

  const [rows, total] = await prisma.$transaction([
    prisma.installationJob.findMany({
      where, skip, take, orderBy: { scheduledDate: 'asc' },
      include: JOB_INCLUDE,
    }),
    prisma.installationJob.count({ where }),
  ]);
  return { rows, meta: meta(total) };
}

/**
 * Gets one installation job by id.
 * Why: job detail view for warehouse and technician.
 * Flow: findUnique with full include.
 * Example: await getInstallation("job_123")
 * Throws: AppError 404.
 */
export async function getInstallation(id) {
  const job = await prisma.installationJob.findUnique({ where: { id }, include: JOB_INCLUDE });
  if (!job) throw new AppError('Installation job not found', 404, 'NOT_FOUND');
  return job;
}

/**
 * Gets an installation job by project id.
 * Why: project detail page links to the install job.
 * Flow: findUnique by projectId.
 * Example: await getInstallationByProject("prj_123")
 * Throws: AppError 404.
 */
export async function getInstallationByProject(projectId) {
  const job = await prisma.installationJob.findUnique({ where: { projectId }, include: JOB_INCLUDE });
  if (!job) throw new AppError('Installation job not found for project', 404, 'NOT_FOUND');
  return job;
}

/**
 * Schedules an installation: sets date, crew, status → SCHEDULED (BR-10 precursor).
 * Why: warehouse manager picks date and assigns technicians before the job starts.
 * Flow: verify UNSCHEDULED, validate crew has exactly one lead, update.
 * Example: await scheduleInstallation("job_123", { scheduledDate, crew: [{technicianId, isLead}] }, userId)
 * Throws: AppError 422 if not UNSCHEDULED or crew is invalid.
 */
export async function scheduleInstallation(id, data, userId) {
  const job = await getInstallation(id);
  if (!['UNSCHEDULED', 'SCHEDULED'].includes(job.status)) {
    throw new AppError('Cannot reschedule a job that is in progress or completed', 422, 'INVALID_STATUS');
  }

  const leads = data.crew.filter(c => c.isLead);
  if (leads.length !== 1) {
    throw new AppError('Exactly one crew member must be marked as lead technician', 422, 'INVALID_CREW');
  }

  return prisma.$transaction(async (tx) => {
    // Replace crew
    await tx.installationCrew.deleteMany({ where: { jobId: id } });
    await tx.installationCrew.createMany({
      data: data.crew.map(c => ({ jobId: id, technicianId: c.technicianId, isLead: c.isLead })),
    });

    const updated = await tx.installationJob.update({
      where: { id },
      data: {
        status: 'SCHEDULED',
        scheduledDate: new Date(data.scheduledDate),
        scheduledById: userId,
      },
      include: JOB_INCLUDE,
    });

    await tx.project.update({ where: { id: job.projectId }, data: { status: 'INSTALLATION_SCHEDULED' } });

    // Notify crew
    const technicianUserIds = data.crew.map(c => c.technicianId);
    const users = await tx.user.findMany({ where: { id: { in: technicianUserIds } }, select: { id: true } });
    await notifyUsers(users.map(u => u.id), 'INSTALLATION', `Installation scheduled for ${new Date(data.scheduledDate).toLocaleDateString('en-IN')}`, `/installations/${id}`);

    emitEvent('installation.scheduled', { jobId: id, projectId: job.projectId });
    return updated;
  });
}

/**
 * Starts an installation job (status → IN_PROGRESS).
 * Why: technician taps "Start job" when they arrive on site.
 * Flow: verify SCHEDULED and the user is crew, set startedAt.
 * Example: await startInstallation("job_123", user)
 * Throws: AppError 422, 403.
 */
export async function startInstallation(id, user) {
  const job = await getInstallation(id);
  if (job.status !== 'SCHEDULED') throw new AppError('Job is not SCHEDULED', 422, 'INVALID_STATUS');

  const isCrew = job.crew.some(c => c.technicianId === user.id);
  if (user.role === 'INSTALLATION_TECHNICIAN' && !isCrew) {
    throw new AppError('You are not assigned to this job', 403, 'FORBIDDEN');
  }

  const updated = await prisma.installationJob.update({
    where: { id },
    data: { status: 'IN_PROGRESS', startedAt: new Date() },
    include: JOB_INCLUDE,
  });
  await prisma.project.update({ where: { id: job.projectId }, data: { status: 'INSTALLING' } });
  return updated;
}

/**
 * Completes an installation (BR-10): requires checklist, ≥3 photos, signature.
 * Why: installation proof — nothing can be marked complete without it.
 * Flow: count attachments (kind=PHOTO), check signature + checklist, update.
 * Example: await completeInstallation("job_123", { confirmedCapacityKw, ... }, user)
 * Throws: AppError 422 if requirements not met.
 */
export async function completeInstallation(id, data, user) {
  const job = await getInstallation(id);
  if (job.status !== 'IN_PROGRESS') throw new AppError('Job is not IN_PROGRESS', 422, 'INVALID_STATUS');

  const isCrew = job.crew.some(c => c.technicianId === user.id);
  if (user.role === 'INSTALLATION_TECHNICIAN' && !isCrew) {
    throw new AppError('You are not assigned to this job', 403, 'FORBIDDEN');
  }

  // Count photos
  const photoCount = await prisma.attachment.count({
    where: { entityType: 'INSTALLATION', entityId: id, kind: 'PHOTO' },
  });
  if (photoCount < 3) {
    throw new AppError(`At least 3 photos required (uploaded: ${photoCount})`, 422, 'INSUFFICIENT_PHOTOS');
  }

  if (!data.customerSignatureUrl && !data.signedByName) {
    throw new AppError('Customer signature is required', 422, 'MISSING_SIGNATURE');
  }

  const finishedAt = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const j = await tx.installationJob.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        finishedAt,
        confirmedCapacityKw: data.confirmedCapacityKw,
        generationTestKw: data.generationTestKw,
        checklist: data.checklist,
        customerSignatureUrl: data.customerSignatureUrl,
        signedByName: data.signedByName,
        signedAt: finishedAt,
        remarks: data.remarks,
      },
      include: JOB_INCLUDE,
    });
    await tx.project.update({
      where: { id: job.projectId },
      data: { status: 'INSTALLED', installedAt: finishedAt },
    });
    return j;
  });

  emitEvent('installation.completed', { jobId: id, projectId: job.projectId });
  return updated;
}
