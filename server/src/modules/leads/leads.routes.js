import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import * as ctrl from './leads.controller.js';
import * as v from './leads.validation.js';

/**
 * leads — Member B.
 * GET/POST /leads, GET/PATCH /leads/:id, action endpoints.
 */
const router = Router();
router.use(requireAuth, requireRole('SALES_EXECUTIVE', 'DIRECTOR'));

router.get('/', validate({ query: v.listLeads }), asyncHandler(ctrl.listLeads));
router.post('/', validate({ body: v.createLead }), asyncHandler(ctrl.createLead));
router.get('/:id', validate({ params: v.leadId }), asyncHandler(ctrl.getLead));
router.patch('/:id', validate({ params: v.leadId, body: v.updateLead }), asyncHandler(ctrl.updateLead));
router.post('/:id/activities', validate({ params: v.leadId, body: v.addActivity }), asyncHandler(ctrl.addActivity));
router.post('/:id/qualify', validate({ params: v.leadId, body: v.qualify }), asyncHandler(ctrl.qualifyLead));
router.post('/:id/assign', validate({ params: v.leadId, body: v.assign }), asyncHandler(ctrl.assignLead));
router.post('/:id/mark-lost', validate({ params: v.leadId, body: v.markLost }), asyncHandler(ctrl.markLeadLost));

export default router;
