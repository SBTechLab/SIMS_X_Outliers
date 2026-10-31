/**
 * The only error type services throw.
 *
 * Why: every failure must reach the client as { code, message, details } so the UI can
 *      branch on a stable code instead of matching message text (RULES.md section 5).
 * Example:
 *   throw new AppError(409, 'ADVANCE_NOT_RECEIVED', 'Advance payment not received.',
 *     { required: '54000.00', paid: '5000.00' })
 */
export class AppError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, AppError);
  }
}

/** Shorthands for the cases that come up on nearly every route. */
export const notFound = (what = 'Record') => new AppError(404, 'NOT_FOUND', `${what} not found.`);

export const forbidden = (message = 'You do not have access to this record.') =>
  new AppError(403, 'FORBIDDEN', message);

export const unauthenticated = (message = 'Please sign in to continue.') =>
  new AppError(401, 'UNAUTHENTICATED', message);

export const invalidTransition = (from, to) =>
  new AppError(409, 'INVALID_TRANSITION', `Cannot move from ${from} to ${to}.`, { from, to });
