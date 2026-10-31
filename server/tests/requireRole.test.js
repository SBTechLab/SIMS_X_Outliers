import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { requireRole } from '../src/middlewares/requireRole.js';
import { AppError } from '../src/core/AppError.js';

describe('requireRole middleware', () => {
  it('throws at boot time if an invalid role is passed', () => {
    assert.throws(
      () => requireRole('INVALID_ROLE'),
      /requireRole: unknown role "INVALID_ROLE"/,
    );
  });

  it('rejects unauthenticated request with 401', () => {
    const middleware = requireRole('SUPER_ADMIN');
    const req = {};
    let errorPassed = null;
    middleware(req, {}, (err) => {
      errorPassed = err;
    });

    assert.ok(errorPassed instanceof AppError);
    assert.equal(errorPassed.status, 401);
    assert.equal(errorPassed.code, 'UNAUTHENTICATED');
  });

  it('rejects unauthorized role with 403', () => {
    const middleware = requireRole('SUPER_ADMIN', 'DIRECTOR');
    const req = { user: { id: 'u1', role: 'CUSTOMER' } };
    let errorPassed = null;
    middleware(req, {}, (err) => {
      errorPassed = err;
    });

    assert.ok(errorPassed instanceof AppError);
    assert.equal(errorPassed.status, 403);
    assert.equal(errorPassed.code, 'FORBIDDEN');
  });

  it('calls next() without error when user has an allowed role', () => {
    const middleware = requireRole('SUPER_ADMIN', 'DIRECTOR');
    const req = { user: { id: 'u1', role: 'SUPER_ADMIN' } };
    let calledNext = false;
    let errorPassed = null;
    middleware(req, {}, (err) => {
      calledNext = true;
      errorPassed = err;
    });

    assert.equal(calledNext, true);
    assert.equal(errorPassed, undefined);
  });
});

