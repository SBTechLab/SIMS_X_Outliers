import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import * as ctrl from './invoices.controller.js';
import * as v from './invoices.validation.js';

/**
 * invoices — Member A.
 * DIRECTOR + SUPER_ADMIN: full access. SALES_EXECUTIVE: read. CUSTOMER: read own via /me.
 */
const router = Router();

router.use(requireAuth);

router.get(
  '/',
  requireRole('SUPER_ADMIN', 'DIRECTOR', 'SALES_EXECUTIVE'),
  validate({ query: v.listQuery }),
  asyncHandler(ctrl.listInvoicesCtrl),
);

router.get(
  '/:id',
  requireRole('SUPER_ADMIN', 'DIRECTOR', 'SALES_EXECUTIVE'),
  validate({ params: v.invoiceId }),
  asyncHandler(ctrl.getInvoiceCtrl),
);

router.patch(
  '/:id/status',
  requireRole('SUPER_ADMIN', 'DIRECTOR'),
  validate({ params: v.invoiceId, body: v.statusUpdate }),
  asyncHandler(ctrl.updateInvoiceStatusCtrl),
);

export default router;
