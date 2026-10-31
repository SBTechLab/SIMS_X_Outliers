import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { notImplemented } from '../../core/notImplemented.js';

/**
 * serials — Member C. See docs/API_CONTRACTS.md for the full contract.
 *
 * Guard: WAREHOUSE_MANAGER manages serial numbers; SUPPORT_EXECUTIVE looks up by serial.
 */
const router = Router();

router.use(
  requireAuth,
  requireRole(
    'SUPER_ADMIN',
    'DIRECTOR',
    'WAREHOUSE_MANAGER',
    'SUPPORT_EXECUTIVE',
  ),
);
router.use(notImplemented);

export default router;
