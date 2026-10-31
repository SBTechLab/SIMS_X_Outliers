import { ok } from '../../core/response.js';
import * as service from './settings.service.js';

export async function get(req, res) {
  const settings = await service.getSettings();
  return ok(res, settings);
}

export async function update(req, res) {
  const settings = await service.updateSettings(req.body, req.user, req.ip);
  return ok(res, settings);
}
