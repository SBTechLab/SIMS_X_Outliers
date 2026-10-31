import { ok } from '../../core/response.js';
import {
  getOverview, getProfitabilityReport, projectProfit,
  getPipelineReport, getUnfinishedReport, getServiceReport,
} from './reports.service.js';

export async function overviewCtrl(req, res) {
  const data = await getOverview({ from: req.query.from, to: req.query.to });
  return ok(res, data);
}

export async function profitabilityCtrl(req, res) {
  const result = await getProfitabilityReport(req.query);
  return ok(res, result.data, result.meta);
}

export async function projectProfitCtrl(req, res) {
  const data = await projectProfit(req.params.projectId);
  if (!data) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found.' } });
  return ok(res, data);
}

export async function pipelineCtrl(req, res) {
  const data = await getPipelineReport();
  return ok(res, data);
}

export async function unfinishedCtrl(req, res) {
  const data = await getUnfinishedReport();
  return ok(res, data);
}

export async function serviceCtrl(req, res) {
  const data = await getServiceReport();
  return ok(res, data);
}
