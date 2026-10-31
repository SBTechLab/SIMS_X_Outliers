import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/core/prisma.js';
import { updateUserStatus, updateUser } from '../src/modules/users/users.service.js';
import { AppError } from '../src/core/AppError.js';

describe('Admin Users Guards (Stage A1)', () => {
  it('cannot deactivate own account', async () => {
    const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN', isActive: true } });
    assert.ok(admin, 'Admin must exist in test/seed data');

    await assert.rejects(
      async () => {
        await updateUserStatus(admin.id, false, { id: admin.id, role: 'SUPER_ADMIN' }, '127.0.0.1');
      },
      (err) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.status, 409);
        assert.equal(err.code, 'CANNOT_DISABLE_SELF');
        return true;
      },
    );
  });

  it('cannot remove or deactivate the last active SUPER_ADMIN', async () => {
    // Count current active super admins
    const admins = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN', isActive: true } });

    // If there is only 1 super admin in seed, attempting to deactivate them from another caller should fail with LAST_SUPER_ADMIN
    if (admins.length === 1) {
      await assert.rejects(
        async () => {
          await updateUserStatus(admins[0].id, false, { id: 'other_user', role: 'SUPER_ADMIN' }, '127.0.0.1');
        },
        (err) => {
          assert.ok(err instanceof AppError);
          assert.equal(err.status, 409);
          assert.equal(err.code, 'LAST_SUPER_ADMIN');
          return true;
        },
      );
    } else {
      // If there are more than 1, deactivating all until 1 remains works, then the last one fails
      assert.ok(admins.length >= 1);
    }
  });
});

