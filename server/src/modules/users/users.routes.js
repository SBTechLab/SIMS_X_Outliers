import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import * as controller from './users.controller.js';
import * as v from './users.validation.js';

const router = Router();

router.use(requireAuth);

// Technicians endpoint is accessible to multiple roles that assign technicians
router.get(
  '/technicians',
  requireRole(
    'SUPER_ADMIN',
    'DIRECTOR',
    'SALES_EXECUTIVE',
    'WAREHOUSE_MANAGER',
    'SUPPORT_EXECUTIVE',
  ),
  validate({ query: v.getTechnicians }),
  asyncHandler(controller.getTechnicians),
);

// All other endpoints are SUPER_ADMIN only
router.use(requireRole('SUPER_ADMIN'));

router.get('/', validate({ query: v.listUsers }), asyncHandler(controller.list));
router.post('/', validate({ body: v.createUser }), asyncHandler(controller.create));
router.patch('/:id', validate({ body: v.updateUser }), asyncHandler(controller.update));
router.patch('/:id/status', validate({ body: v.updateStatus }), asyncHandler(controller.updateStatus));
router.post('/:id/reset-password', validate({ body: v.resetPassword }), asyncHandler(controller.resetPassword));

export default router;
