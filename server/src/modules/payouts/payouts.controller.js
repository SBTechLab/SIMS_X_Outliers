import { ok, created } from '../../core/response.js';
import {
  listPayouts, getPayout, generatePayouts, approvePayout,
  markPayoutPaid, listPendingTimeLogs, approveTimeLog,
} from './payouts.service.js';

export async function listPayoutsCtrl(req, res) {
  const result = await listPayouts(req.query);
  return ok(res, result.data, result.meta);
}

export async function getPayoutCtrl(req, res) {
  const payout = await getPayout(req.params.id);
  return ok(res, payout);
}

export async function generatePayoutsCtrl(req, res) {
  const results = await generatePayouts(req.body);
  return created(res, results);
}

export async function approvePayoutCtrl(req, res) {
  const payout = await approvePayout(req.params.id);
  return ok(res, payout);
}

export async function markPayoutPaidCtrl(req, res) {
  const payout = await markPayoutPaid(req.params.id, req.body);
  return ok(res, payout);
}

export async function listPendingTimeLogsCtrl(req, res) {
  const result = await listPendingTimeLogs(req.query);
  return ok(res, result.data, result.meta);
}

export async function approveTimeLogCtrl(req, res) {
  const log = await approveTimeLog(req.params.id);
  return ok(res, log);
}
