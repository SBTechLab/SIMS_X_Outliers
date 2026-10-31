import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { notImplemented } from '../../core/notImplemented.js';

/**
 * dispatches — Member C. See docs/API_CONTRACTS.md for the full contract.
 *
 * Guard: WAREHOUSE_MANAGER scans and dispatches (BR-07).
 */
const router = Router();

router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR', 'WAREHOUSE_MANAGER'));
router.use(notImplemented);

export default router;
