import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { notImplemented } from '../../core/notImplemented.js';

/**
 * invoices — Member A. See docs/API_CONTRACTS.md for the full contract.
 *
 * Guard: DIRECTOR + SALES_EXECUTIVE can manage invoices; CUSTOMER views their
 * own invoices via /me/invoices (Member B). This stub guards the staff endpoint.
 */
const router = Router();

router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR', 'SALES_EXECUTIVE'));
router.use(notImplemented);

export default router;
