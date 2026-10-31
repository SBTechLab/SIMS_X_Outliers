import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { lookupHandler, getCustomer360Handler, checkWarrantyHandler, getDashboardHandler } from './support.controller.js';

const router = Router();
router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR', 'SUPPORT_EXECUTIVE'));

router.get('/dashboard', getDashboardHandler);
router.get('/lookup', lookupHandler);
router.get('/customers/:customerId', getCustomer360Handler);
router.get('/warranties/:serialNumber', checkWarrantyHandler);

export default router;
