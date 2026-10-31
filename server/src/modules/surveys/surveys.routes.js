import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import { uploadFiles } from '../../core/upload.js';
import * as ctrl from './surveys.controller.js';
import * as v from './surveys.validation.js';

/**
 * surveys — Member B.
 * POST /surveys, GET /surveys, GET /surveys/:id, action endpoints.
 */
const router = Router();
router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR', 'SALES_EXECUTIVE', 'SURVEY_TECHNICIAN'));

router.post(
  '/',
  requireRole('SALES_EXECUTIVE', 'DIRECTOR'),
  validate({ body: v.createSurvey }),
  asyncHandler(ctrl.createSurvey),
);

router.get('/', validate({ query: v.listSurveys }), asyncHandler(ctrl.listSurveys));
router.get('/:id', validate({ params: v.surveyId }), asyncHandler(ctrl.getSurvey));

router.post(
  '/:id/start',
  requireRole('SURVEY_TECHNICIAN'),
  validate({ params: v.surveyId }),
  asyncHandler(ctrl.startSurvey),
);

router.put(
  '/:id/report',
  requireRole('SURVEY_TECHNICIAN'),
  validate({ params: v.surveyId }),
  uploadFiles,
  validate({ body: v.surveyReport }),
  asyncHandler(ctrl.submitReport),
);

router.post(
  '/:id/approve',
  requireRole('SALES_EXECUTIVE', 'DIRECTOR'),
  validate({ params: v.surveyId, body: v.approve }),
  asyncHandler(ctrl.approveSurvey),
);

router.post(
  '/:id/reject',
  requireRole('SALES_EXECUTIVE', 'DIRECTOR'),
  validate({ params: v.surveyId, body: v.reject }),
  asyncHandler(ctrl.rejectSurvey),
);

router.patch(
  '/:id/reschedule',
  requireRole('SALES_EXECUTIVE', 'DIRECTOR'),
  validate({ params: v.surveyId, body: v.reschedule }),
  asyncHandler(ctrl.rescheduleSurvey),
);

export default router;
