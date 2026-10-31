import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { notImplemented } from '../../core/notImplemented.js';

/**
 * purchases — Member C. See docs/API_CONTRACTS.md for the full contract.
 *
 * Guard: WAREHOUSE_MANAGER records GRNs; DIRECTOR views for cost tracking.
 */
const router = Router();

router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR', 'WAREHOUSE_MANAGER'));
router.use(notImplemented);

export default router;
