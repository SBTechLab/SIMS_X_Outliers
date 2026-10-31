import * as service from './users.service.js';
import { ok, created } from '../../core/response.js';

export async function list(req, res) {
  const result = await service.listUsers(req.query);
  return ok(res, result.users, result.meta);
}

export async function create(req, res) {
  const user = await service.createUser(req.body, req.user, req.ip);
  return created(res, { user });
}

export async function update(req, res) {
  const user = await service.updateUser(req.params.id, req.body, req.user, req.ip);
  return ok(res, { user });
}

export async function updateStatus(req, res) {
  const user = await service.updateUserStatus(req.params.id, req.body.isActive, req.user, req.ip);
  return ok(res, { user });
}

export async function resetPassword(req, res) {
  const result = await service.resetPassword(req.params.id, req.body?.newPassword, req.user, req.ip);
  return ok(res, result);
}

export async function getTechnicians(req, res) {
  const technicians = await service.getTechnicians(req.query.type);
  return ok(res, technicians);
}
