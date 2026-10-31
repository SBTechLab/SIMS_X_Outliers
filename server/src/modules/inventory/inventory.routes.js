import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { notImplemented } from '../../core/notImplemented.js';

/**
 * inventory — Member C. See docs/API_CONTRACTS.md for the full contract.
 *
 * Guard: WAREHOUSE_MANAGER manages stock levels.
 */
const router = Router();

router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR', 'WAREHOUSE_MANAGER'));
router.use(notImplemented);

export default router;
