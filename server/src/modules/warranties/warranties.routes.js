import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { notImplemented } from '../../core/notImplemented.js';

/**
 * warranties — Member C. See docs/API_CONTRACTS.md for the full contract.
 *
 * Guard: SUPPORT_EXECUTIVE checks warranty status; WAREHOUSE_MANAGER records deliveries
 * that start warranty clocks (BR-09).
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
