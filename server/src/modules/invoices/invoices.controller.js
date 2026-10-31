import { ok } from '../../core/response.js';
import { listInvoices, getInvoice, updateInvoiceStatus } from './invoices.service.js';

export async function listInvoicesCtrl(req, res) {
  const result = await listInvoices(req.query);
  return ok(res, result.data, result.meta);
}

export async function getInvoiceCtrl(req, res) {
  const invoice = await getInvoice(req.params.id);
  return ok(res, invoice);
}

export async function updateInvoiceStatusCtrl(req, res) {
  const invoice = await updateInvoiceStatus(req.params.id, req.body.status, req.user);
  return ok(res, invoice);
}
