import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { listPurchasesHandler, getPurchaseHandler, createPurchaseHandler, listSuppliersHandler, createSupplierHandler } from './purchases.controller.js';

const router = Router();
router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR', 'WAREHOUSE_MANAGER'));

router.get('/suppliers', listSuppliersHandler);
router.post('/suppliers', requireRole('SUPER_ADMIN', 'WAREHOUSE_MANAGER'), createSupplierHandler);
router.get('/', listPurchasesHandler);
router.post('/', requireRole('SUPER_ADMIN', 'WAREHOUSE_MANAGER'), createPurchaseHandler);
router.get('/:id', getPurchaseHandler);

export default router;
