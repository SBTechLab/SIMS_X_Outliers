import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { notImplemented } from '../../core/notImplemented.js';

/**
 * customers — Member B. See docs/API_CONTRACTS.md for the full contract.
 *
 * Staff customer lookup/management endpoint. CUSTOMER self-service is in /me/*.
 */
const router = Router();

router.use(
  requireAuth,
  requireRole(
    'SUPER_ADMIN',
    'DIRECTOR',
    'SALES_EXECUTIVE',
    'SUPPORT_EXECUTIVE',
  ),
);
router.use(notImplemented);

export default router;
