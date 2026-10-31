import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import * as controller from './audit.controller.js';
import * as v from './audit.validation.js';

const router = Router();

router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR'));

router.get('/', validate({ query: v.listAuditLogs }), asyncHandler(controller.list));

export default router;
