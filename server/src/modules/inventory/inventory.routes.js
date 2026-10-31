import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { getInventoryHandler, getLowStockHandler } from './inventory.controller.js';

const router = Router();
router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR', 'WAREHOUSE_MANAGER'));

router.get('/', getInventoryHandler);
router.get('/low-stock', getLowStockHandler);

export default router;
