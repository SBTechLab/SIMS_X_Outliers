import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../core/AppError.js';
import { prisma } from '../../core/prisma.js';
import { AUDIT, logAudit } from '../../core/audit.js';

export const BCRYPT_ROUNDS = 10;
export const TOKEN_TTL = '8h';
export const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000;

/** The only user shape that leaves this module. passwordHash is never selected into it. */
const publicUser = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  customer: { select: { id: true } },
};

function shape(user) {
  const { customer, ...rest } = user;
  return { ...rest, customerId: customer?.id ?? null };
}

/** Hashes a password. bcrypt, 10 rounds (SECURITY.md section 1). */
export function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/** Signs the session token. Carries only { sub, role } — nothing secret goes in a JWT. */
export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: TOKEN_TTL });
}

/**
 * Signs a user in with an email or a 10-digit phone.
 *
 * Why: staff were created by email, customers by phone, and neither should have to remember
 *      which. D-01 — the caller puts the returned token in an httpOnly cookie, never the body.
 * Flow: decide whether the identifier is a phone or an email -> load the user with the hash ->
 *       compare -> reject inactive -> update lastLoginAt -> return { user, token }.
 * Example:
 *   await loginUser({ identifier: "sales1@sunpower.in", password: "Demo@1234" })
 *   // → { user: { id: "usr_k3f9", role: "SALES_EXECUTIVE" }, token: "eyJ..." }
 * Throws: AppError 401 INVALID_CREDENTIALS for an unknown identifier OR a wrong password —
 *         deliberately the same error, so the API never reveals which accounts exist
 *         (SECURITY.md section 11);
 *         AppError 403 ACCOUNT_DISABLED when isActive is false.
 */
export async function loginUser({ identifier, password }) {
  const isPhone = /^[6-9]\d{9}$/.test(identifier);

  const user = await prisma.user.findFirst({
    where: isPhone ? { phone: identifier } : { email: identifier.toLowerCase() },
    select: { ...publicUser, passwordHash: true },
  });

  const genericFailure = new AppError(
    401,
    'INVALID_CREDENTIALS',
    'Email or password is incorrect.',
  );

  if (!user) {
    // Compare against a dummy hash anyway, so a missing account and a wrong password take
    // the same time and cannot be told apart by timing.
    await bcrypt.compare(password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
    throw genericFailure;
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) throw genericFailure;

  if (!user.isActive) {
    throw new AppError(403, 'ACCOUNT_DISABLED', 'This account has been deactivated.');
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const { passwordHash: _hash, ...rest } = user;
  return { user: shape(rest), token: signToken(user) };
}

/**
 * Returns the signed-in user for GET /auth/me.
 *
 * Why: the React app calls this on every page load to rebuild the session, so it must be cheap
 *      and must never include the hash.
 * Flow: load by id with the public select.
 * Example:
 *   await getMe("usr_k3f9")
 *   // → { id: "usr_k3f9", name: "Priya Desai", role: "SALES_EXECUTIVE", customerId: null }
 * Throws: AppError 401 UNAUTHENTICATED if the user has since been removed.
 */
export async function getMe(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUser });
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Your session is no longer valid.');
  return shape(user);
}

/**
 * Self-signup for a customer.
 *
 * Why: a homeowner who enquired three weeks ago should keep their quotes and projects when
 *      they create a login, so the new User is linked to any existing Customer with that phone
 *      rather than creating a second customer record.
 * Flow: check the phone and email are free -> in one transaction, create the CUSTOMER user and
 *       either attach it to the matching Customer or create one -> return { user, token }.
 * Example:
 *   await registerCustomer({ name: "Ramesh Yadav", phone: "9701234567", password: "Demo@1234" })
 *   // → { user: { id: "usr_n2p1", role: "CUSTOMER", customerId: "cus_8" }, token: "eyJ..." }
 * Throws: AppError 409 PHONE_IN_USE when a login already exists for the phone;
 *         AppError 409 EMAIL_IN_USE when the email is taken.
 */
export async function registerCustomer({ name, phone, email, password }) {
  const existingPhone = await prisma.user.findUnique({ where: { phone } });
  if (existingPhone) {
    throw new AppError(409, 'PHONE_IN_USE', 'An account already exists for this phone number.');
  }

  if (email) {
    const existingEmail = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingEmail) {
      throw new AppError(409, 'EMAIL_IN_USE', 'An account already exists for this email address.');
    }
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    // A User.email is required and unique, so a customer without one gets a derived address.
    const createdUser = await tx.user.create({
      data: {
        name,
        phone,
        email: (email ?? `${phone}@customer.sunpower.in`).toLowerCase(),
        passwordHash,
        role: 'CUSTOMER',
      },
      select: publicUser,
    });

    // The link that preserves earlier history: an unclaimed Customer with this phone.
    const existingCustomer = await tx.customer.findFirst({
      where: { phone, userId: null },
      orderBy: { createdAt: 'asc' },
    });

    if (existingCustomer) {
      await tx.customer.update({
        where: { id: existingCustomer.id },
        data: { userId: createdUser.id, email: email ?? existingCustomer.email },
      });
    } else {
      await tx.customer.create({
        data: { userId: createdUser.id, name, phone, email: email ?? null },
      });
    }

    return tx.user.findUnique({ where: { id: createdUser.id }, select: publicUser });
  });

  return { user: shape(user), token: signToken(user) };
}

/**
 * Changes the signed-in user's own password.
 *
 * Why: BR-18 — an account takeover trail. The current password is verified first, so a stolen
 *      session cannot silently lock the real owner out.
 * Flow: load the hash -> compare the current password -> rehash -> update + audit in one
 *       transaction.
 * Example:
 *   await changePassword("usr_k3f9", { currentPassword: "Demo@1234", newPassword: "Monsoon2026" },
 *                        "127.0.0.1")
 *   // → { changed: true }
 * Throws: AppError 401 INVALID_CREDENTIALS when the current password is wrong;
 *         AppError 422 SAME_PASSWORD when the new password matches the old one.
 */
export async function changePassword(userId, { currentPassword, newPassword }, ip) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Your session is no longer valid.');

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Your current password is incorrect.');
  }

  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    throw new AppError(422, 'SAME_PASSWORD', 'Choose a password you have not used here before.');
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
    await logAudit(
      {
        userId,
        action: AUDIT.PASSWORD_CHANGED,
        entityType: 'User',
        entityId: userId,
        after: { passwordChangedAt: new Date().toISOString() },
        ip,
      },
      tx,
    );
  });

  return { changed: true };
}
