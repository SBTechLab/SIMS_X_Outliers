import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { listDispatchesHandler, getDispatchHandler, startPackingHandler, scanSerialHandler, packLineHandler, markReadyHandler, dispatchGoodsHandler, recordDeliveryHandler } from './dispatches.controller.js';

const router = Router();
router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR', 'WAREHOUSE_MANAGER'));

router.get('/', listDispatchesHandler);
router.get('/:id', getDispatchHandler);
router.patch('/:id/pack', startPackingHandler);
router.post('/:id/scan', scanSerialHandler);
router.patch('/:id/lines/:lineId/packed', packLineHandler);
router.patch('/:id/ready', markReadyHandler);
router.patch('/:id/dispatch', dispatchGoodsHandler);
router.patch('/:id/deliver', recordDeliveryHandler);

export default router;
