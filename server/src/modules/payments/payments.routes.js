import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import * as ctrl from './payments.controller.js';
import * as v from './payments.validation.js';

/**
 * payments — Member B. Money is recorded, not processed (D-05).
 */
const router = Router();
router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR', 'SALES_EXECUTIVE'));

router.post('/', validate({ body: v.recordPayment }), asyncHandler(ctrl.recordPayment));
router.get('/', validate({ query: v.listPayments }), asyncHandler(ctrl.listPayments));
router.get('/:id', validate({ params: v.paymentId }), asyncHandler(ctrl.getPayment));

export default router;
