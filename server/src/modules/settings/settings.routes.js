import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import * as controller from './settings.controller.js';
import * as v from './settings.validation.js';

/**
 * settings — Member A. Implemented, because every other module reads rates from here (BR-14).
 *
 * GET /settings   any staff session
 * PUT /settings   SUPER_ADMIN
 */
const router = Router();

router.use(requireAuth);

// Read is open to every signed-in staff role: quotes need defaultTaxPercent, the warehouse
// needs the company block, support needs labourRatePerHour.
router.get(
  '/',
  requireRole(
    'SUPER_ADMIN',
    'DIRECTOR',
    'SALES_EXECUTIVE',
    'SURVEY_TECHNICIAN',
    'WAREHOUSE_MANAGER',
    'INSTALLATION_TECHNICIAN',
    'SUPPORT_EXECUTIVE',
  ),
  asyncHandler(controller.get),
);

router.put(
  '/',
  requireRole('SUPER_ADMIN'),
  validate({ body: v.updateSettings }),
  asyncHandler(controller.update),
);

export default router;
