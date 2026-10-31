import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { notImplemented } from '../../core/notImplemented.js';

/**
 * me — Member B. See docs/API_CONTRACTS.md for the full contract.
 *
 * CUSTOMER self-service portal: projects, quotes, invoices, systems, tickets.
 * Only CUSTOMER can access this router; staff use their own module endpoints.
 */
const router = Router();

router.use(requireAuth, requireRole('CUSTOMER'));
router.use(notImplemented);

export default router;
