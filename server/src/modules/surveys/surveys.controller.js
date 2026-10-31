import { ok, created } from '../../core/response.js';
import * as service from './surveys.service.js';

export async function createSurvey(req, res) {
  const survey = await service.createSurvey(req.body, req.user);
  return created(res, { survey });
}

export async function listSurveys(req, res) {
  const result = await service.listSurveys(req.query, req.user);
  return ok(res, result.surveys, result.meta);
}

export async function getSurvey(req, res) {
  const survey = await service.getSurvey(req.params.id, req.user);
  return ok(res, { survey });
}

export async function startSurvey(req, res) {
  const survey = await service.startSurvey(req.params.id, req.user);
  return ok(res, { survey });
}

export async function submitReport(req, res) {
  const survey = await service.submitReport(req.params.id, req.body, req.files, req.user);
  return ok(res, { survey });
}

export async function approveSurvey(req, res) {
  const survey = await service.approveSurvey(req.params.id, req.body, req.user);
  return ok(res, { survey });
}

export async function rejectSurvey(req, res) {
  const survey = await service.rejectSurvey(req.params.id, req.body, req.user);
  return ok(res, { survey });
}

export async function rescheduleSurvey(req, res) {
  const survey = await service.rescheduleSurvey(req.params.id, req.body);
  return ok(res, { survey });
}
