import { AppError } from './AppError.js';

/**
 * Placeholder handler for a module whose routes exist but whose logic is not written yet.
 *
 * Why: every module's router is mounted from day one, so the path exists, the client can be
 *      built against it, and a teammate pulling main never hits a 404 that looks like a typo
 *      in their own code. A clear 501 with the owning member is a far better signal.
 * Flow: throw 501 NOT_IMPLEMENTED naming the method and path.
 * Example:
 *   router.use(notImplemented)
 *   // → 501 { code: "NOT_IMPLEMENTED", message: "GET /api/v1/leads is not implemented yet." }
 * Throws: AppError 501 NOT_IMPLEMENTED, always.
 */
export function notImplemented(req, _res, next) {
  next(
    new AppError(
      501,
      'NOT_IMPLEMENTED',
      `${req.method} ${req.baseUrl}${req.path === '/' ? '' : req.path} is not implemented yet.`,
      { module: req.baseUrl.replace('/api/v1/', '') },
    ),
  );
}
