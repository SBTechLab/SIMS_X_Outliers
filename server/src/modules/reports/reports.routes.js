import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import * as ctrl from './reports.controller.js';

const router = Router();

router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR'));

router.get('/overview', asyncHandler(ctrl.overviewCtrl));
router.get('/profitability', asyncHandler(ctrl.profitabilityCtrl));
router.get('/profitability/:projectId', asyncHandler(ctrl.projectProfitCtrl));
router.get('/pipeline', asyncHandler(ctrl.pipelineCtrl));
router.get('/unfinished', asyncHandler(ctrl.unfinishedCtrl));
router.get('/service', asyncHandler(ctrl.serviceCtrl));

export default router;
