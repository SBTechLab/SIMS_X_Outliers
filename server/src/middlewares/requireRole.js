import { AppError } from '../core/AppError.js';

/** The eight locked roles (docs/AGENTS.md section 4). Never add, remove, rename or merge one. */
export const ROLES = Object.freeze([
  'SUPER_ADMIN',
  'DIRECTOR',
  'SALES_EXECUTIVE',
  'SURVEY_TECHNICIAN',
  'CUSTOMER',
  'WAREHOUSE_MANAGER',
  'INSTALLATION_TECHNICIAN',
  'SUPPORT_EXECUTIVE',
]);

/**
 * Layer 1 of authorization: gates a route by role.
 *
 * Why: SECURITY.md section 7 — a role check says WHAT KIND of user may call this endpoint.
 *      It does not say whose data this is, so the service must still apply the ownership
 *      check (BR-16). Both layers are required; neither is sufficient alone.
 * Flow: read req.user.role (never the body, a header or a query parameter, which a caller
 *       controls) and compare it against the allowed list.
 * Example:
 *   router.post("/:id/confirm", requireRole("SALES_EXECUTIVE", "DIRECTOR"), ...)
 *   // → calls next() for a sales executive, throws 403 for a warehouse manager
 * Throws: AppError 401 UNAUTHENTICATED when requireAuth did not run or found no user;
 *         AppError 403 FORBIDDEN when the role is not on the list.
 */
export function requireRole(...allowed) {
  const allowedRoles = allowed.flat();

  // A typo in a role name would silently lock everyone out, so fail at boot instead.
  for (const role of allowedRoles) {
    if (!ROLES.includes(role)) {
      throw new Error(`requireRole: unknown role "${role}". The 8 roles are locked.`);
    }
  }

  return function roleGuard(req, _res, next) {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'),
      );
    }
    return next();
  };
}
