import { ok, created } from '../../core/response.js';
import * as service from './leads.service.js';

export async function listLeads(req, res) {
  const result = await service.listLeads(req.query);
  return ok(res, result.leads, result.meta);
}

export async function createLead(req, res) {
  const lead = await service.createLead(req.body, req.user);
  return created(res, { lead });
}

export async function getLead(req, res) {
  const lead = await service.getLead(req.params.id);
  return ok(res, { lead });
}

export async function updateLead(req, res) {
  const lead = await service.updateLead(req.params.id, req.body);
  return ok(res, { lead });
}

export async function addActivity(req, res) {
  const activity = await service.addActivity(req.params.id, req.body, req.user);
  return created(res, { activity });
}

export async function qualifyLead(req, res) {
  const lead = await service.qualifyLead(req.params.id, req.body);
  return ok(res, { lead });
}

export async function assignLead(req, res) {
  const lead = await service.assignLead(req.params.id, req.body);
  return ok(res, { lead });
}

export async function markLeadLost(req, res) {
  const lead = await service.markLeadLost(req.params.id, req.body);
  return ok(res, { lead });
}
