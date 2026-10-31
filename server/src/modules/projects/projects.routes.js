import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import * as ctrl from './projects.controller.js';
import * as v from './projects.validation.js';

/**
 * projects — Member B.
 */
const router = Router();
router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR', 'SALES_EXECUTIVE', 'WAREHOUSE_MANAGER', 'INSTALLATION_TECHNICIAN'));

router.get('/', validate({ query: v.listProjects }), asyncHandler(ctrl.listProjects));
router.get('/:id', validate({ params: v.projectId }), asyncHandler(ctrl.getProject));

router.post(
  '/:id/confirm',
  requireRole('SALES_EXECUTIVE', 'DIRECTOR'),
  validate({ params: v.projectId, body: v.confirmProject }),
  asyncHandler(ctrl.confirmProject),
);

router.post(
  '/:id/cancel',
  requireRole('SALES_EXECUTIVE', 'DIRECTOR'),
  validate({ params: v.projectId, body: v.cancelProject }),
  asyncHandler(ctrl.cancelProject),
);

export default router;
