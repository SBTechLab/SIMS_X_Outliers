import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { notImplemented } from '../../core/notImplemented.js';

/**
 * leads — Member B. See docs/API_CONTRACTS.md for the full contract.
 *
 * Guard: SALES_EXECUTIVE owns lead board; DIRECTOR can view.
 */
const router = Router();

router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR', 'SALES_EXECUTIVE'));
router.use(notImplemented);

export default router;
