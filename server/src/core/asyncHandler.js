/**
 * Wraps an async route handler so a thrown error reaches the Express error handler
 * instead of becoming an unhandled rejection.
 *
 * Why: controllers must contain no try/catch (RULES.md section 5). Every async handler
 *      is wrapped, without exception.
 * Example:
 *   router.post('/', asyncHandler(controller.create))
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
