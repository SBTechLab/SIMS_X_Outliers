import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../core/AppError.js';
import { prisma } from '../core/prisma.js';

export const COOKIE_NAME = 'sp_token';

/**
 * Verifies the session cookie and puts the current user on req.user.
 *
 * Why: D-01 — the JWT lives in an httpOnly cookie, so JavaScript cannot steal it. The role on
 *      the token is NOT trusted: the user is re-read from the database on every request, so
 *      deactivating an account or changing a role takes effect immediately rather than in 8h.
 * Flow: read the sp_token cookie, verify the signature, load the user, reject an inactive one,
 *       attach { id, name, email, phone, role, customerId } to req.
 * Example:
 *   router.use(requireAuth)
 *   // → req.user = { id: "usr_k3f9", role: "SALES_EXECUTIVE", ... }
 * Throws: AppError 401 UNAUTHENTICATED when the cookie is missing, invalid, expired or points
 *         at a deleted user; AppError 403 ACCOUNT_DISABLED when isActive is false.
 */
export async function requireAuth(req, _res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    }

    let payload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch {
      // Expired and tampered tokens are the same answer — we do not tell the caller which.
      throw new AppError(401, 'UNAUTHENTICATED', 'Your session has expired. Please sign in again.');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        customer: { select: { id: true } },
      },
    });

    if (!user) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Your session is no longer valid.');
    }
    if (!user.isActive) {
      throw new AppError(403, 'ACCOUNT_DISABLED', 'This account has been deactivated.');
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      customerId: user.customer?.id ?? null,
    };

    return next();
  } catch (err) {
    return next(err);
  }
}
