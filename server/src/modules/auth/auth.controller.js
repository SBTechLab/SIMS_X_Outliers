import { env } from '../../config/env.js';
import { ok, created, noContent } from '../../core/response.js';
import { COOKIE_NAME } from '../../middlewares/requireAuth.js';
import * as service from './auth.service.js';

/** D-01 — httpOnly so JavaScript cannot read it; sameSite=lax is our CSRF defence. */
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.isProduction,
  maxAge: service.COOKIE_MAX_AGE_MS,
  path: '/',
};

export async function login(req, res) {
  const { user, token } = await service.loginUser(req.body);
  res.cookie(COOKIE_NAME, token, cookieOptions);
  return ok(res, { user });
}

export async function logout(req, res) {
  // Cleared with the same options it was set with, or the browser keeps it.
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: undefined });
  return noContent(res);
}

export async function me(req, res) {
  const user = await service.getMe(req.user.id);
  return ok(res, user);
}

export async function register(req, res) {
  const { user, token } = await service.registerCustomer(req.body);
  res.cookie(COOKIE_NAME, token, cookieOptions);
  return created(res, { user });
}

export async function changePassword(req, res) {
  await service.changePassword(req.user.id, req.body, req.ip);
  return noContent(res);
}
