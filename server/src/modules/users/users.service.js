import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '../../core/prisma.js';
import { AppError } from '../../core/AppError.js';
import { AUDIT, logAudit } from '../../core/audit.js';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  hourlyRate: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Lists users with optional filters and pagination.
 *
 * Why: SUPER_ADMIN user management screen.
 * Flow: builds Prisma where clause with search on name/email/phone, applies pagination.
 * Example:
 *   await listUsers({ role: 'SALES_EXECUTIVE', page: 1, pageSize: 20 })
 * Throws: nothing.
 */
export async function listUsers({ role, isActive, q, page = 1, pageSize = 20 }) {
  const where = {};
  if (role) where.role = role;
  if (isActive !== undefined) where.isActive = isActive;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return { users, meta: { page, pageSize, total } };
}

/**
 * Creates a new user account.
 *
 * Why: SUPER_ADMIN onboarding staff members.
 * Flow: checks email and phone uniqueness, hashes password, records audit log.
 * Example:
 *   await createUser({ name: 'Ravi', email: 'ravi@sunpower.in', role: 'SALES_EXECUTIVE' }, currentUser, '127.0.0.1')
 * Throws: AppError 409 EMAIL_IN_USE, 409 PHONE_IN_USE.
 */
export async function createUser(data, actor, ip) {
  const existingEmail = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingEmail) {
    throw new AppError(409, 'EMAIL_IN_USE', 'A user with this email already exists.');
  }

  if (data.phone) {
    const existingPhone = await prisma.user.findUnique({ where: { phone: data.phone } });
    if (existingPhone) {
      throw new AppError(409, 'PHONE_IN_USE', 'A user with this phone number already exists.');
    }
  }

  const rawPassword = data.password || 'Demo@1234';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        role: data.role,
        passwordHash,
        hourlyRate: data.hourlyRate !== undefined ? data.hourlyRate : null,
      },
      select: USER_SELECT,
    });

    await logAudit(
      {
        userId: actor?.id,
        action: AUDIT.USER_CREATED,
        entityType: 'User',
        entityId: created.id,
        before: null,
        after: { name: created.name, email: created.email, role: created.role },
        ip,
      },
      tx,
    );

    return created;
  });

  return user;
}

/**
 * Updates an existing user's details or role.
 *
 * Why: SUPER_ADMIN modifying staff permissions or contact info.
 * Flow: checks target exists, checks uniqueness on change, audits role change if applicable.
 * Example:
 *   await updateUser('usr_123', { role: 'DIRECTOR' }, actor, '127.0.0.1')
 * Throws: AppError 404 NOT_FOUND, 409 EMAIL_IN_USE, 409 LAST_SUPER_ADMIN.
 */
export async function updateUser(id, data, actor, ip) {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    throw new AppError(404, 'NOT_FOUND', 'User not found.');
  }

  if (data.email && data.email !== target.email) {
    const emailExists = await prisma.user.findUnique({ where: { email: data.email } });
    if (emailExists) throw new AppError(409, 'EMAIL_IN_USE', 'Email is already in use.');
  }

  if (data.phone && data.phone !== target.phone) {
    const phoneExists = await prisma.user.findUnique({ where: { phone: data.phone } });
    if (phoneExists) throw new AppError(409, 'PHONE_IN_USE', 'Phone is already in use.');
  }

  if (target.role === 'SUPER_ADMIN' && data.role && data.role !== 'SUPER_ADMIN') {
    const superAdminCount = await prisma.user.count({
      where: { role: 'SUPER_ADMIN', isActive: true },
    });
    if (superAdminCount <= 1) {
      throw new AppError(409, 'LAST_SUPER_ADMIN', 'Cannot change the role of the last active Super Admin.');
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.user.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.role && { role: data.role }),
        ...(data.hourlyRate !== undefined && { hourlyRate: data.hourlyRate }),
      },
      select: USER_SELECT,
    });

    const isRoleChange = data.role && data.role !== target.role;
    await logAudit(
      {
        userId: actor?.id,
        action: isRoleChange ? AUDIT.USER_ROLE_CHANGED : AUDIT.USER_UPDATED,
        entityType: 'User',
        entityId: id,
        before: { name: target.name, role: target.role, email: target.email },
        after: { name: res.name, role: res.role, email: res.email },
        ip,
      },
      tx,
    );

    return res;
  });

  return updated;
}

/**
 * Activates or deactivates a user account.
 *
 * Why: BR-15 — accounts are deactivated, never deleted, preserving historical assignments.
 * Flow: checks self-deactivation guard and last active SUPER_ADMIN guard.
 * Example:
 *   await updateUserStatus('usr_123', false, actor, '127.0.0.1')
 * Throws: AppError 409 CANNOT_DISABLE_SELF, 409 LAST_SUPER_ADMIN.
 */
export async function updateUserStatus(id, isActive, actor, ip) {
  if (actor?.id === id && !isActive) {
    throw new AppError(409, 'CANNOT_DISABLE_SELF', 'You cannot deactivate your own account.');
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    throw new AppError(404, 'NOT_FOUND', 'User not found.');
  }

  if (target.role === 'SUPER_ADMIN' && !isActive) {
    const superAdminCount = await prisma.user.count({
      where: { role: 'SUPER_ADMIN', isActive: true },
    });
    if (superAdminCount <= 1) {
      throw new AppError(409, 'LAST_SUPER_ADMIN', 'Cannot deactivate the last active Super Admin.');
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.user.update({
      where: { id },
      data: { isActive },
      select: USER_SELECT,
    });

    await logAudit(
      {
        userId: actor?.id,
        action: AUDIT.USER_STATUS_CHANGED,
        entityType: 'User',
        entityId: id,
        before: { isActive: target.isActive },
        after: { isActive: res.isActive },
        ip,
      },
      tx,
    );

    return res;
  });

  return updated;
}

/**
 * Resets a user's password, generating a temporary password if none provided.
 *
 * Why: SUPER_ADMIN password recovery helper.
 * Flow: generates random password, hashes it, stores it, audits the action.
 * Example:
 *   const { temporaryPassword } = await resetPassword('usr_123', null, actor, '127.0.0.1')
 * Throws: AppError 404 NOT_FOUND.
 */
export async function resetPassword(id, newPassword, actor, ip) {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    throw new AppError(404, 'NOT_FOUND', 'User not found.');
  }

  const tempPassword = newPassword || `Sun@${crypto.randomBytes(4).toString('hex')}!`;
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: { passwordHash },
    });

    await logAudit(
      {
        userId: actor?.id,
        action: AUDIT.USER_PASSWORD_RESET,
        entityType: 'User',
        entityId: id,
        before: null,
        after: { reset: true },
        ip,
      },
      tx,
    );
  });

  return { temporaryPassword: tempPassword };
}

/**
 * Lists active technicians for assignments.
 *
 * Why: sales needs survey technicians; warehouse needs installation crews.
 * Flow: queries active users filtered by SURVEY_TECHNICIAN or INSTALLATION_TECHNICIAN.
 * Example:
 *   await getTechnicians('survey')
 * Throws: nothing.
 */
export async function getTechnicians(type) {
  let roles = ['SURVEY_TECHNICIAN', 'INSTALLATION_TECHNICIAN'];
  if (type === 'survey') roles = ['SURVEY_TECHNICIAN'];
  if (type === 'installation') roles = ['INSTALLATION_TECHNICIAN'];

  return prisma.user.findMany({
    where: {
      role: { in: roles },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      hourlyRate: true,
    },
    orderBy: { name: 'asc' },
  });
}

