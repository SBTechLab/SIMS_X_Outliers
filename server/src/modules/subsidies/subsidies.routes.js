import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import * as ctrl from './subsidies.controller.js';
import * as v from './subsidies.validation.js';

const router = Router();

router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR', 'SALES_EXECUTIVE'));

router.get('/', validate({ query: v.listQuery }), asyncHandler(ctrl.listSubsidiesCtrl));
router.get('/:id', validate({ params: v.subsidyId }), asyncHandler(ctrl.getSubsidyCtrl));

router.patch(
  '/:id',
  requireRole('SUPER_ADMIN', 'DIRECTOR'),
  validate({ params: v.subsidyId, body: v.updateSubsidy }),
  asyncHandler(ctrl.updateSubsidyCtrl),
);

export default router;
