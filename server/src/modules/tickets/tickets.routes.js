import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { notImplemented } from '../../core/notImplemented.js';

/**
 * tickets — Member C. See docs/API_CONTRACTS.md for the full contract.
 *
 * Guard: SUPPORT_EXECUTIVE creates and manages tickets; INSTALLATION_TECHNICIAN
 * updates field status. CUSTOMER raises via /me/tickets.
 */
const router = Router();

router.use(
  requireAuth,
  requireRole(
    'SUPER_ADMIN',
    'DIRECTOR',
    'SUPPORT_EXECUTIVE',
    'INSTALLATION_TECHNICIAN',
  ),
);
router.use(notImplemented);

export default router;
