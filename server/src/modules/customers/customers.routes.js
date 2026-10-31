import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import * as ctrl from './customers.controller.js';
import * as v from './customers.validation.js';

/**
 * customers — Member B. Staff-side customer lookup; self-service is in /me.
 */
const router = Router();
router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR', 'SALES_EXECUTIVE', 'SUPPORT_EXECUTIVE'));

router.get('/', validate({ query: v.listCustomers }), asyncHandler(ctrl.listCustomers));
router.get('/:id', validate({ params: v.customerId }), asyncHandler(ctrl.getCustomer));
router.patch('/:id', validate({ params: v.customerId, body: v.updateCustomer }), asyncHandler(ctrl.updateCustomer));

export default router;
