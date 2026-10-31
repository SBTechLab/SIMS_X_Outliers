import { ok } from '../../core/response.js';
import * as service from './notifications.service.js';

export async function list(req, res) {
  const { rows, meta } = await service.listNotifications(req.user, req.query);
  return ok(res, rows, meta);
}

export async function unreadCount(req, res) {
  const result = await service.unreadCount(req.user);
  return ok(res, result);
}

export async function markRead(req, res) {
  const notification = await service.markRead(req.params.id, req.user);
  return ok(res, notification);
}

export async function markAllRead(req, res) {
  const result = await service.markAllRead(req.user);
  return ok(res, result);
}
