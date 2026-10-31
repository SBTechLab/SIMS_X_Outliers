import { ok } from '../../core/response.js';
import { listSubsidies, getSubsidy, updateSubsidy } from './subsidies.service.js';

export async function listSubsidiesCtrl(req, res) {
  const result = await listSubsidies(req.query);
  return ok(res, result.data, result.meta);
}

export async function getSubsidyCtrl(req, res) {
  const sub = await getSubsidy(req.params.id);
  return ok(res, sub);
}

export async function updateSubsidyCtrl(req, res) {
  const sub = await updateSubsidy(req.params.id, req.body);
  return ok(res, sub);
}
