import { onEvent } from '../../core/events.js';
import { notifyUsers, notifyRole } from '../../core/notify.js';
import { prisma } from '../../core/prisma.js';

/**
 * Surveys event listeners — Member B.
 *
 * survey.created     → notify technician of new assignment.
 * survey.submitted   → notify sales executives to review.
 * survey.approved    → notify assigned sales executive.
 * survey.rescheduled → notify technician.
 */
export default function register() {
  onEvent('survey.created', async ({ surveyId, technicianId }) => {
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      select: { scheduledAt: true, lead: { select: { code: true, name: true, city: true } } },
    });
    if (!survey) return;
    await notifyUsers([technicianId], {
      title: `Survey assigned — ${survey.lead.code}`,
      body: `${survey.lead.name}, ${survey.lead.city ?? ''} on ${survey.scheduledAt.toLocaleDateString('en-IN')}`,
      link: `/field/surveys/${surveyId}`,
    });
  });

  onEvent('survey.submitted', async ({ surveyId }) => {
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      select: { lead: { select: { code: true, name: true, assignedToId: true } } },
    });
    if (!survey) return;
    const title = `Survey ready for review — ${survey.lead.code}`;
    if (survey.lead.assignedToId) {
      await notifyUsers([survey.lead.assignedToId], { title, body: survey.lead.name, link: `/sales/surveys/${surveyId}` });
    } else {
      await notifyRole('SALES_EXECUTIVE', { title, body: survey.lead.name, link: `/sales/surveys/${surveyId}` });
    }
  });

  onEvent('survey.approved', async ({ surveyId }) => {
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      select: { lead: { select: { code: true, name: true, assignedToId: true } } },
    });
    if (!survey || !survey.lead.assignedToId) return;
    await notifyUsers([survey.lead.assignedToId], {
      title: `Survey approved — ${survey.lead.code}`,
      body: `${survey.lead.name} — you can now send a quote.`,
      link: `/sales/leads/${surveyId}`,
    });
  });

  onEvent('survey.rescheduled', async ({ surveyId }) => {
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      select: { technicianId: true, scheduledAt: true, lead: { select: { code: true } } },
    });
    if (!survey) return;
    await notifyUsers([survey.technicianId], {
      title: `Survey rescheduled — ${survey.lead.code}`,
      body: `New date: ${survey.scheduledAt.toLocaleDateString('en-IN')}`,
      link: `/field/surveys/${surveyId}`,
    });
  });
}
