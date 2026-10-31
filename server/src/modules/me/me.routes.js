import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import * as ctrl from './me.controller.js';

/**
 * me — Member B. CUSTOMER self-service portal.
 */
const router = Router();
router.use(requireAuth, requireRole('CUSTOMER'));

router.get('/overview', asyncHandler(ctrl.getOverview));
router.get('/projects', asyncHandler(ctrl.getMyProjects));
router.get('/quotes', asyncHandler(ctrl.getMyQuotes));
router.get('/invoices', asyncHandler(ctrl.getMyInvoices));
router.get('/payments', asyncHandler(ctrl.getMyPayments));

export default router;
