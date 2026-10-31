import { prisma } from '../../core/prisma.js';
import { AppError } from '../../core/AppError.js';
import { emitEvent } from '../../core/events.js';
import { paginate } from '../../core/pagination.js';

const SURVEY_LIST_SELECT = {
  id: true, status: true, scheduledAt: true, submittedAt: true,
  recommendedCapacityKw: true,
  lead: { select: { id: true, code: true, name: true, phone: true, address: true, city: true } },
  technician: { select: { id: true, name: true } },
};

/**
 * Creates a survey for a qualified lead.
 *
 * Why: BR-03 — survey required before quote; lead must be QUALIFIED.
 * Flow: gate lead status, verify technician role, create survey, advance lead status, notify tech.
 * Example:
 *   await createSurvey({ leadId, technicianId, scheduledAt }, actor)
 * Throws: AppError 409 INVALID_TRANSITION, 422 INVALID_TECHNICIAN.
 */
export async function createSurvey(data, actor) {
  const lead = await prisma.lead.findUnique({ where: { id: data.leadId }, select: { id: true, code: true, status: true } });
  if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead not found.');
  if (lead.status !== 'QUALIFIED') {
    throw new AppError(409, 'INVALID_TRANSITION', `Lead must be QUALIFIED to schedule a survey (currently ${lead.status}).`);
  }

  const tech = await prisma.user.findUnique({ where: { id: data.technicianId }, select: { id: true, role: true, name: true } });
  if (!tech || tech.role !== 'SURVEY_TECHNICIAN') {
    throw new AppError(422, 'INVALID_TECHNICIAN', 'Technician must be a SURVEY_TECHNICIAN.');
  }

  const survey = await prisma.$transaction(async (tx) => {
    const s = await tx.survey.create({
      data: {
        leadId: data.leadId,
        technicianId: data.technicianId,
        scheduledAt: data.scheduledAt,
        status: 'SCHEDULED',
      },
      include: { lead: { select: { id: true, code: true, name: true } }, technician: { select: { id: true, name: true } } },
    });
    await tx.lead.update({ where: { id: data.leadId }, data: { status: 'SURVEY_SCHEDULED' } });
    return s;
  });

  emitEvent('survey.created', { surveyId: survey.id, technicianId: data.technicianId });
  return survey;
}

/**
 * Lists surveys with optional filters. Technicians see only their own (BR-16).
 *
 * Why: sales screen shows all; technician field app shows assigned only.
 * Flow: scope by role, filter, paginate.
 * Example:
 *   await listSurveys({ status: 'SCHEDULED' }, actor)
 * Throws: nothing.
 */
export async function listSurveys(query, actor) {
  const { skip, take, meta } = paginate(query);
  const where = {};

  if (actor.role === 'SURVEY_TECHNICIAN') where.technicianId = actor.id;
  else if (query.technicianId) where.technicianId = query.technicianId;

  if (query.status) where.status = query.status;
  if (query.from) where.scheduledAt = { ...where.scheduledAt, gte: query.from };
  if (query.to) where.scheduledAt = { ...where.scheduledAt, lte: query.to };

  const [rows, total] = await Promise.all([
    prisma.survey.findMany({ where, select: SURVEY_LIST_SELECT, orderBy: { scheduledAt: 'asc' }, skip, take }),
    prisma.survey.count({ where }),
  ]);

  return {
    surveys: rows.map((s) => ({
      ...s, recommendedCapacityKw: s.recommendedCapacityKw ? Number(s.recommendedCapacityKw) : null,
    })),
    meta: meta(total),
  };
}

/**
 * Returns a single survey with full detail. Technician forced to own (BR-16).
 *
 * Why: tech reads their assignment; sales reads the report.
 * Flow: load survey, enforce ownership for technician.
 * Throws: AppError 404 NOT_FOUND, 403 FORBIDDEN.
 */
export async function getSurvey(id, actor) {
  const survey = await prisma.survey.findUnique({
    where: { id },
    include: {
      lead: { select: { id: true, code: true, name: true, phone: true, address: true, city: true } },
      technician: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
  });
  if (!survey) throw new AppError(404, 'NOT_FOUND', 'Survey not found.');
  if (actor.role === 'SURVEY_TECHNICIAN' && survey.technicianId !== actor.id) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this survey.');
  }
  return {
    ...survey,
    recommendedCapacityKw: survey.recommendedCapacityKw ? Number(survey.recommendedCapacityKw) : null,
  };
}

/**
 * Marks a survey as IN_PROGRESS.
 *
 * Why: tech starts the clock on arrival.
 * Flow: verify ownership, advance SCHEDULED → IN_PROGRESS.
 * Throws: AppError 409 INVALID_TRANSITION, 403 FORBIDDEN.
 */
export async function startSurvey(id, actor) {
  const survey = await prisma.survey.findUnique({ where: { id }, select: { id: true, status: true, technicianId: true } });
  if (!survey) throw new AppError(404, 'NOT_FOUND', 'Survey not found.');
  if (survey.technicianId !== actor.id) throw new AppError(403, 'FORBIDDEN', 'Not your survey.');
  if (survey.status !== 'SCHEDULED') {
    throw new AppError(409, 'INVALID_TRANSITION', `Survey is ${survey.status}, not SCHEDULED.`);
  }
  return prisma.survey.update({ where: { id }, data: { status: 'IN_PROGRESS' }, select: { id: true, status: true } });
}

/**
 * Submits the survey report with measurements and photos.
 *
 * Why: tech completes the field work; starts approval process.
 * Flow: verify ownership, require ≥1 attachment path in files[], update fields, emit survey.submitted.
 * Throws: AppError 422 PHOTOS_REQUIRED, 409 INVALID_TRANSITION.
 */
export async function submitReport(id, data, files, actor) {
  const survey = await prisma.survey.findUnique({
    where: { id }, select: { id: true, status: true, technicianId: true, leadId: true },
  });
  if (!survey) throw new AppError(404, 'NOT_FOUND', 'Survey not found.');
  if (survey.technicianId !== actor.id) throw new AppError(403, 'FORBIDDEN', 'Not your survey.');
  if (!['SCHEDULED', 'IN_PROGRESS'].includes(survey.status)) {
    throw new AppError(409, 'INVALID_TRANSITION', `Survey is ${survey.status}, cannot submit.`);
  }
  if (!files || files.length === 0) {
    throw new AppError(422, 'PHOTOS_REQUIRED', 'At least one photo is required.');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const s = await tx.survey.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        roofType: data.roofType,
        shadowFreeAreaSqft: data.shadowFreeAreaSqft,
        roofDirection: data.roofDirection,
        tiltDegrees: data.tiltDegrees,
        cableDistanceMeters: data.cableDistanceMeters,
        structureHeightFt: data.structureHeightFt,
        earthingPointAvailable: data.earthingPointAvailable,
        recommendedCapacityKw: String(data.recommendedCapacityKw),
        recommendedSystemType: data.recommendedSystemType,
        notes: data.notes ?? null,
      },
      select: { id: true, status: true, submittedAt: true },
    });
    await tx.lead.update({ where: { id: survey.leadId }, data: { status: 'SURVEY_DONE' } });
    await tx.attachment.createMany({
      data: files.map((f) => ({
        entityType: 'SURVEY', entityId: id,
        fileUrl: f.path.replace(/\\/g, '/').replace(/.*\/uploads\//, '/uploads/'),
        fileName: f.originalname,
        mimeType: f.mimetype,
        sizeBytes: f.size,
        kind: 'PHOTO',
      })),
    });
    return s;
  });

  emitEvent('survey.submitted', { surveyId: id });
  return updated;
}

/**
 * Approves a submitted survey, unlocking quoting (BR-03).
 *
 * Why: sales validates the report before any quote goes out.
 * Flow: SUBMITTED → APPROVED, lead → SURVEY_APPROVED, emit survey.approved.
 * Throws: AppError 409 INVALID_TRANSITION.
 */
export async function approveSurvey(id, data, actor) {
  const survey = await prisma.survey.findUnique({
    where: { id }, select: { id: true, status: true, leadId: true },
  });
  if (!survey) throw new AppError(404, 'NOT_FOUND', 'Survey not found.');
  if (survey.status !== 'SUBMITTED') {
    throw new AppError(409, 'INVALID_TRANSITION', `Survey is ${survey.status}, not SUBMITTED.`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const s = await tx.survey.update({
      where: { id },
      data: { status: 'APPROVED', reviewedById: actor.id, reviewedAt: new Date(), notes: data.notes ?? undefined },
      select: { id: true, status: true, reviewedAt: true },
    });
    await tx.lead.update({ where: { id: survey.leadId }, data: { status: 'SURVEY_APPROVED' } });
    return s;
  });

  emitEvent('survey.approved', { surveyId: id });
  return updated;
}

/**
 * Rejects a submitted survey.
 *
 * Why: measurements insufficient; tech must revisit.
 * Flow: SUBMITTED → REJECTED, lead → SURVEY_REJECTED.
 * Throws: AppError 409 INVALID_TRANSITION.
 */
export async function rejectSurvey(id, data, actor) {
  const survey = await prisma.survey.findUnique({
    where: { id }, select: { id: true, status: true, leadId: true },
  });
  if (!survey) throw new AppError(404, 'NOT_FOUND', 'Survey not found.');
  if (survey.status !== 'SUBMITTED') {
    throw new AppError(409, 'INVALID_TRANSITION', `Survey is ${survey.status}, not SUBMITTED.`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const s = await tx.survey.update({
      where: { id },
      data: { status: 'REJECTED', rejectionReason: data.rejectionReason, reviewedById: actor.id, reviewedAt: new Date() },
      select: { id: true, status: true, rejectionReason: true },
    });
    await tx.lead.update({ where: { id: survey.leadId }, data: { status: 'SURVEY_REJECTED' } });
    return s;
  });

  return updated;
}

/**
 * Reschedules a survey while it is SCHEDULED.
 *
 * Why: customer or tech unavailable; can also change the technician.
 * Flow: verify SCHEDULED, update scheduledAt and optionally technicianId.
 * Throws: AppError 409 INVALID_TRANSITION.
 */
export async function rescheduleSurvey(id, data) {
  const survey = await prisma.survey.findUnique({
    where: { id }, select: { id: true, status: true, technicianId: true },
  });
  if (!survey) throw new AppError(404, 'NOT_FOUND', 'Survey not found.');
  if (survey.status !== 'SCHEDULED') {
    throw new AppError(409, 'INVALID_TRANSITION', `Can only reschedule a SCHEDULED survey (currently ${survey.status}).`);
  }

  if (data.technicianId) {
    const tech = await prisma.user.findUnique({ where: { id: data.technicianId }, select: { role: true } });
    if (!tech || tech.role !== 'SURVEY_TECHNICIAN') {
      throw new AppError(422, 'INVALID_TECHNICIAN', 'Technician must be a SURVEY_TECHNICIAN.');
    }
  }

  const updated = await prisma.survey.update({
    where: { id },
    data: {
      scheduledAt: data.scheduledAt,
      ...(data.technicianId && { technicianId: data.technicianId }),
    },
    select: { id: true, status: true, scheduledAt: true, technician: { select: { id: true, name: true } } },
  });

  emitEvent('survey.rescheduled', { surveyId: id });
  return updated;
}
