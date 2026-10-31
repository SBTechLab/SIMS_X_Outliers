import * as service from './kit-templates.service.js';
import { ok, created } from '../../core/response.js';

export async function list(req, res) {
  const templates = await service.listKitTemplates(req.query);
  return ok(res, templates);
}

export async function get(req, res) {
  const template = await service.getKitTemplate(req.params.id);
  return ok(res, template);
}

export async function create(req, res) {
  const template = await service.createKitTemplate(req.body, req.user, req.ip);
  return created(res, template);
}

export async function update(req, res) {
  const template = await service.updateKitTemplate(req.params.id, req.body, req.user, req.ip);
  return ok(res, template);
}

export async function updateItems(req, res) {
  const template = await service.updateKitTemplateItems(req.params.id, req.body.items, req.user, req.ip);
  return ok(res, template);
}
