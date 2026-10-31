import { AppError } from '../core/AppError.js';

/**
 * Catches any request that matched no route, so an unknown path returns the standard error
 * envelope rather than Express's HTML page.
 *
 * Why: the client's axios interceptor expects { success: false, error: { code } } from every
 *      failed request, including a typo in a URL.
 */
export function notFound(req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', `No endpoint for ${req.method} ${req.originalUrl}.`));
}
