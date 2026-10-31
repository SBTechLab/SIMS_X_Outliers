import { ok, created } from '../../core/response.js';
import * as service from './projects.service.js';

export async function listProjects(req, res) {
  const result = await service.listProjects(req.query);
  return ok(res, result.projects, result.meta);
}

export async function getProject(req, res) {
  const project = await service.getProject(req.params.id);
  return ok(res, { project });
}

export async function confirmProject(req, res) {
  const project = await service.confirmProject(req.params.id);
  return ok(res, { project });
}

export async function cancelProject(req, res) {
  const project = await service.cancelProject(req.params.id, req.body);
  return ok(res, { project });
}
