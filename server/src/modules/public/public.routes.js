import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { publicEnquiryLimiter, sharedReportLimiter } from '../../middlewares/rateLimits.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import { ok, created } from '../../core/response.js';
import { notImplemented } from '../../core/notImplemented.js';
import * as service from './public.service.js';
import * as v from './public.validation.js';

/**
 * public — Member B. The three listed endpoints are implemented so the landing page and the
 * enquiry form render from day one. B extends this file with the full contract.
 *
 * GET  /public/packages            implemented
 * POST /public/enquiries           implemented, rate limited 5/hour
 * GET  /public/stats               implemented
 * GET  /public/reports/:token      implemented (report payload still owned by Member A)
 */
const router = Router();

router.get(
  '/packages',
  asyncHandler(async (_req, res) => ok(res, await service.listPackages())),
);

router.get(
  '/stats',
  asyncHandler(async (_req, res) => ok(res, await service.getStats())),
);

router.post(
  '/enquiries',
  publicEnquiryLimiter,
  validate({ body: v.enquiry }),
  asyncHandler(async (req, res) => created(res, await service.createPublicEnquiry(req.body))),
);

router.get(
  '/reports/:token',
  sharedReportLimiter,
  validate({ params: v.token }),
  asyncHandler(async (req, res) => ok(res, await service.openSharedReport(req.params.token))),
);

// Anything else under /public is reserved for Member B.
router.use(notImplemented);

export default router;
