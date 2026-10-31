import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import { searchCtrl } from './search.controller.js';

const router = Router();

router.use(requireAuth, requireRole(
  'SUPER_ADMIN', 'DIRECTOR', 'SALES_EXECUTIVE', 'SURVEY_TECHNICIAN',
  'WAREHOUSE_MANAGER', 'INSTALLATION_TECHNICIAN', 'SUPPORT_EXECUTIVE',
));

router.get('/', asyncHandler(searchCtrl));

export default router;
