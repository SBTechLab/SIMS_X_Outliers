import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { notImplemented } from '../../core/notImplemented.js';

/**
 * installations — Member C. See docs/API_CONTRACTS.md for the full contract.
 *
 * Guard: WAREHOUSE_MANAGER schedules; INSTALLATION_TECHNICIAN submits
 * completion report + photos.
 */
const router = Router();

router.use(
  requireAuth,
  requireRole(
    'SUPER_ADMIN',
    'DIRECTOR',
    'WAREHOUSE_MANAGER',
    'INSTALLATION_TECHNICIAN',
  ),
);
router.use(notImplemented);

export default router;
