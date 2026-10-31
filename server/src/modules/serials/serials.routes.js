import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { listSerialsHandler, getSerialByNumberHandler, getSerialByIdHandler } from './serials.controller.js';

const router = Router();
router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR', 'WAREHOUSE_MANAGER', 'SUPPORT_EXECUTIVE'));

router.get('/', listSerialsHandler);
router.get('/by-number/:serialNumber', getSerialByNumberHandler);
router.get('/:id', getSerialByIdHandler);

export default router;
