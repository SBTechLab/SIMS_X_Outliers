import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { notImplemented } from '../../core/notImplemented.js';

/**
 * subsidies — Member A. See docs/API_CONTRACTS.md for the full contract.
 *
 * Guard: DIRECTOR manages PM Surya Ghar paperwork (out of scope: real portal).
 */
const router = Router();

router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR'));
router.use(notImplemented);

export default router;
