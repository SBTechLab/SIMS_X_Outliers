import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { listProductsHandler, getProductHandler, createProductHandler, updateProductHandler, adjustStockHandler } from './products.controller.js';

const router = Router();
router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR', 'WAREHOUSE_MANAGER'));

router.get('/', listProductsHandler);
router.post('/', requireRole('SUPER_ADMIN', 'WAREHOUSE_MANAGER'), createProductHandler);
router.get('/:id', getProductHandler);
router.patch('/:id', requireRole('SUPER_ADMIN', 'WAREHOUSE_MANAGER'), updateProductHandler);
router.post('/:id/stock', requireRole('SUPER_ADMIN', 'WAREHOUSE_MANAGER'), adjustStockHandler);

export default router;
