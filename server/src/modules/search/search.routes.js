import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { notImplemented } from '../../core/notImplemented.js';

/**
 * search — Member A/C shared. See docs/API_CONTRACTS.md for the full contract.
 *
 * Guard: all staff roles. CUSTOMER uses dedicated /me/* routes.
 */
const router = Router();

router.use(
  requireAuth,
  requireRole(
    'SUPER_ADMIN',
    'DIRECTOR',
    'SALES_EXECUTIVE',
    'SURVEY_TECHNICIAN',
    'WAREHOUSE_MANAGER',
    'INSTALLATION_TECHNICIAN',
    'SUPPORT_EXECUTIVE',
  ),
);
router.use(notImplemented);

export default router;
