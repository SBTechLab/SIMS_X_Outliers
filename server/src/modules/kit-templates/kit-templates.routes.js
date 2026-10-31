import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import * as controller from './kit-templates.controller.js';
import * as v from './kit-templates.validation.js';

const router = Router();

router.use(requireAuth);

// GET is open to any staff session (needed for quotes and viewing)
router.get(
  '/',
  requireRole(
    'SUPER_ADMIN',
    'DIRECTOR',
    'SALES_EXECUTIVE',
    'SURVEY_TECHNICIAN',
    'WAREHOUSE_MANAGER',
    'INSTALLATION_TECHNICIAN',
    'SUPPORT_EXECUTIVE',
  ),
  validate({ query: v.listTemplates }),
  asyncHandler(controller.list),
);

router.get(
  '/:id',
  requireRole(
    'SUPER_ADMIN',
    'DIRECTOR',
    'SALES_EXECUTIVE',
    'SURVEY_TECHNICIAN',
    'WAREHOUSE_MANAGER',
    'INSTALLATION_TECHNICIAN',
    'SUPPORT_EXECUTIVE',
  ),
  asyncHandler(controller.get),
);

// Mutating endpoints are SUPER_ADMIN only
router.use(requireRole('SUPER_ADMIN'));

router.post('/', validate({ body: v.createTemplate }), asyncHandler(controller.create));
router.patch('/:id', validate({ body: v.updateTemplate }), asyncHandler(controller.update));
router.put('/:id/items', validate({ body: v.updateTemplateItems }), asyncHandler(controller.updateItems));

export default router;
