import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import * as ctrl from './payouts.controller.js';
import * as v from './payouts.validation.js';

const router = Router();

router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR'));

router.get('/', validate({ query: v.listQuery }), asyncHandler(ctrl.listPayoutsCtrl));
router.get('/time-logs/pending', validate({ query: v.timeLogQuery }), asyncHandler(ctrl.listPendingTimeLogsCtrl));
router.post('/generate', validate({ body: v.generatePayouts }), asyncHandler(ctrl.generatePayoutsCtrl));
router.get('/:id', validate({ params: v.payoutId }), asyncHandler(ctrl.getPayoutCtrl));
router.patch('/:id/approve', validate({ params: v.payoutId }), asyncHandler(ctrl.approvePayoutCtrl));
router.patch('/:id/mark-paid', validate({ params: v.payoutId, body: v.markPaid }), asyncHandler(ctrl.markPayoutPaidCtrl));
router.patch('/time-logs/:id/approve', validate({ params: v.timeLogId }), asyncHandler(ctrl.approveTimeLogCtrl));

export default router;
