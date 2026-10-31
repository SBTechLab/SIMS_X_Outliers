import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import * as controller from './notifications.controller.js';
import * as v from './notifications.validation.js';

/**
 * notifications — Member A. Implemented.
 *
 * Every route is own-rows-only (BR-16), so there is no requireRole: a notification belongs to
 * exactly one user, whatever their role.
 *
 * GET   /notifications               own
 * GET   /notifications/unread-count  own
 * PATCH /notifications/:id/read      own
 * PATCH /notifications/read-all      own
 */
const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: v.listQuery }), asyncHandler(controller.list));

router.get('/unread-count', asyncHandler(controller.unreadCount));

// Declared before /:id/read so "read-all" is never parsed as an id.
router.patch('/read-all', asyncHandler(controller.markAllRead));

router.patch('/:id/read', validate({ params: v.idParam }), asyncHandler(controller.markRead));

export default router;
