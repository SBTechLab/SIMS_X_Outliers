import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { listTicketsHandler, getTicketHandler, createTicketHandler, assignTicketHandler, updateStatusHandler, resolveTicketHandler, confirmTicketHandler, addActivityHandler, addPartHandler } from './tickets.controller.js';

const router = Router();
router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR', 'SUPPORT_EXECUTIVE', 'INSTALLATION_TECHNICIAN', 'CUSTOMER'));

router.get('/', listTicketsHandler);
router.post('/', requireRole('SUPER_ADMIN', 'SUPPORT_EXECUTIVE', 'CUSTOMER'), createTicketHandler);
router.get('/:id', getTicketHandler);
router.patch('/:id/assign', requireRole('SUPER_ADMIN', 'SUPPORT_EXECUTIVE'), assignTicketHandler);
router.patch('/:id/status', updateStatusHandler);
router.patch('/:id/resolve', resolveTicketHandler);
// BR-12: customer confirms the resolution to close the ticket
router.patch('/:id/confirm', requireRole('SUPER_ADMIN', 'SUPPORT_EXECUTIVE', 'CUSTOMER'), confirmTicketHandler);
router.post('/:id/activities', addActivityHandler);
router.post('/:id/parts', requireRole('SUPER_ADMIN', 'SUPPORT_EXECUTIVE', 'INSTALLATION_TECHNICIAN'), addPartHandler);

export default router;
