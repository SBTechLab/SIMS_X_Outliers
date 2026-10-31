import { ok } from '../../core/response.js';
import * as service from './me.service.js';

export async function getOverview(req, res) {
  const data = await service.getOverview(req.user);
  return ok(res, data);
}

export async function getMyProjects(req, res) {
  const projects = await service.getMyProjects(req.user);
  return ok(res, { projects });
}

export async function getMyQuotes(req, res) {
  const quotes = await service.getMyQuotes(req.user);
  return ok(res, { quotes });
}

export async function getMyInvoices(req, res) {
  const invoices = await service.getMyInvoices(req.user);
  return ok(res, { invoices });
}

export async function getMyPayments(req, res) {
  const payments = await service.getMyPayments(req.user);
  return ok(res, { payments });
}

export async function getMySystems(req, res) {
  const systems = await service.getMySystems(req.user);
  return ok(res, { systems });
}
