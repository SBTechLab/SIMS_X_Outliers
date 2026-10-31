import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import * as ctrl from './quotes.controller.js';
import * as v from './quotes.validation.js';

/**
 * quotes — Member B.
 * POST /quotes, GET /quotes, GET /quotes/:id, action endpoints.
 * CUSTOMER is allowed on read + accept/reject (BR-16 enforced in service).
 */
const router = Router();
router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR', 'SALES_EXECUTIVE', 'CUSTOMER'));

router.post(
  '/',
  requireRole('SALES_EXECUTIVE', 'DIRECTOR'),
  validate({ body: v.createQuote }),
  asyncHandler(ctrl.createQuote),
);

router.get('/', validate({ query: v.listQuotes }), asyncHandler(ctrl.listQuotes));
router.get('/:id', validate({ params: v.quoteId }), asyncHandler(ctrl.getQuote));

router.patch(
  '/:id',
  requireRole('SALES_EXECUTIVE', 'DIRECTOR'),
  validate({ params: v.quoteId, body: v.updateQuote }),
  asyncHandler(ctrl.updateQuote),
);

router.put(
  '/:id/items',
  requireRole('SALES_EXECUTIVE', 'DIRECTOR'),
  validate({ params: v.quoteId, body: v.replaceItems }),
  asyncHandler(ctrl.replaceItems),
);

router.post(
  '/:id/send',
  requireRole('SALES_EXECUTIVE', 'DIRECTOR'),
  validate({ params: v.quoteId, body: v.sendQuote }),
  asyncHandler(ctrl.sendQuote),
);

router.post(
  '/:id/accept',
  validate({ params: v.quoteId, body: v.acceptQuote }),
  asyncHandler(ctrl.acceptQuote),
);

router.post(
  '/:id/reject',
  validate({ params: v.quoteId, body: v.rejectQuote }),
  asyncHandler(ctrl.rejectQuote),
);

export default router;
