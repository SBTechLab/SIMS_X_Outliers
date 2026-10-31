import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { notImplemented } from '../../core/notImplemented.js';

/**
 * support — Member C. See docs/API_CONTRACTS.md for the full contract.
 *
 * Guard: SUPPORT_EXECUTIVE dashboard — customer lookup, global ticket list.
 */
const router = Router();

router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR', 'SUPPORT_EXECUTIVE'));
router.use(notImplemented);

export default router;
