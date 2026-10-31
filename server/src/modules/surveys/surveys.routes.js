import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { notImplemented } from '../../core/notImplemented.js';

/**
 * surveys — Member B. See docs/API_CONTRACTS.md for the full contract.
 *
 * Guard: SURVEY_TECHNICIAN submits reports; SALES_EXECUTIVE approves/rejects.
 */
const router = Router();

router.use(
  requireAuth,
  requireRole('SUPER_ADMIN', 'DIRECTOR', 'SALES_EXECUTIVE', 'SURVEY_TECHNICIAN'),
);
router.use(notImplemented);

export default router;
