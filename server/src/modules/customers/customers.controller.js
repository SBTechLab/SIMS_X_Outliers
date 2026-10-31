import { ok } from '../../core/response.js';
import * as service from './customers.service.js';

export async function listCustomers(req, res) {
  const result = await service.listCustomers(req.query);
  return ok(res, result.customers, result.meta);
}

export async function getCustomer(req, res) {
  const customer = await service.getCustomer(req.params.id);
  return ok(res, { customer });
}

export async function updateCustomer(req, res) {
  const customer = await service.updateCustomer(req.params.id, req.body);
  return ok(res, { customer });
}
