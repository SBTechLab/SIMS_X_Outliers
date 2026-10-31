import { ok, created } from '../../core/response.js';
import * as service from './payments.service.js';

export async function recordPayment(req, res) {
  const payment = await service.recordPayment(req.body, req.user);
  return created(res, { payment });
}

export async function listPayments(req, res) {
  const result = await service.listPayments(req.query);
  return ok(res, result.payments, result.meta);
}

export async function getPayment(req, res) {
  const payment = await service.getPayment(req.params.id);
  return ok(res, { payment });
}
