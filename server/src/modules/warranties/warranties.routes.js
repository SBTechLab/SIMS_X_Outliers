import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { listWarrantiesHandler, getWarrantyHandler, voidWarrantyHandler } from './warranties.controller.js';

const router = Router();
router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR', 'WAREHOUSE_MANAGER', 'SUPPORT_EXECUTIVE'));

router.get('/', listWarrantiesHandler);
router.get('/:id', getWarrantyHandler);
router.patch('/:id/void', requireRole('SUPER_ADMIN', 'SUPPORT_EXECUTIVE'), voidWarrantyHandler);

export default router;
