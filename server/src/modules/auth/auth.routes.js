import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { validate } from '../../middlewares/validate.js';
import { loginLimiter, registerLimiter } from '../../middlewares/rateLimits.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import * as controller from './auth.controller.js';
import * as v from './auth.validation.js';

/**
 * auth — Member A. Implemented.
 *
 * POST /auth/login             public, rate limited 10/15min
 * POST /auth/logout            any session
 * GET  /auth/me                any session
 * POST /auth/register          public, rate limited 5/hour — CUSTOMER self-signup by phone
 * POST /auth/change-password   any session
 */
const router = Router();

router.post('/login', loginLimiter, validate({ body: v.login }), asyncHandler(controller.login));

router.post(
  '/register',
  registerLimiter,
  validate({ body: v.register }),
  asyncHandler(controller.register),
);

// Logout tolerates an expired session: signing out must always work.
router.post('/logout', asyncHandler(controller.logout));

router.get('/me', requireAuth, asyncHandler(controller.me));

router.post(
  '/change-password',
  requireAuth,
  validate({ body: v.changePassword }),
  asyncHandler(controller.changePassword),
);

export default router;
