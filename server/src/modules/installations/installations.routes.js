import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { listInstallationsHandler, getInstallationHandler, getByProjectHandler, scheduleHandler, startHandler, completeHandler } from './installations.controller.js';

const router = Router();
router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR', 'WAREHOUSE_MANAGER', 'INSTALLATION_TECHNICIAN'));

router.get('/', listInstallationsHandler);
router.get('/by-project/:projectId', getByProjectHandler);
router.get('/:id', getInstallationHandler);
router.patch('/:id/schedule', requireRole('SUPER_ADMIN', 'WAREHOUSE_MANAGER'), scheduleHandler);
router.patch('/:id/start', startHandler);
router.post('/:id/complete', completeHandler);

export default router;
