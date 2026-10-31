import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { notImplemented } from '../../core/notImplemented.js';

/**
 * projects — Member B. See docs/API_CONTRACTS.md for the full contract.
 *
 * Guard: multi-role. SALES_EXECUTIVE advances; WAREHOUSE_MANAGER dispatches;
 * INSTALLATION_TECHNICIAN closes. CUSTOMER views via /me/projects.
 */
const router = Router();

router.use(
  requireAuth,
  requireRole(
    'SUPER_ADMIN',
    'DIRECTOR',
    'SALES_EXECUTIVE',
    'WAREHOUSE_MANAGER',
    'INSTALLATION_TECHNICIAN',
  ),
);
router.use(notImplemented);

export default router;
