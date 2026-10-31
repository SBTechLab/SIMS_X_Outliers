import { ok, created } from '../../core/response.js';
import * as service from './quotes.service.js';

export async function createQuote(req, res) {
  const quote = await service.createQuote(req.body, req.user);
  return created(res, { quote });
}

export async function listQuotes(req, res) {
  const result = await service.listQuotes(req.query, req.user);
  return ok(res, result.quotes, result.meta);
}

export async function getQuote(req, res) {
  const quote = await service.getQuote(req.params.id, req.user);
  return ok(res, { quote });
}

export async function updateQuote(req, res) {
  const quote = await service.updateQuote(req.params.id, req.body, req.user);
  return ok(res, { quote });
}

export async function replaceItems(req, res) {
  const quote = await service.replaceItems(req.params.id, req.body);
  return ok(res, { quote });
}

export async function sendQuote(req, res) {
  const quote = await service.sendQuote(req.params.id);
  return ok(res, { quote });
}

export async function acceptQuote(req, res) {
  const quote = await service.acceptQuote(req.params.id, req.body, req.user);
  return ok(res, { quote });
}

export async function rejectQuote(req, res) {
  const quote = await service.rejectQuote(req.params.id, req.body, req.user);
  return ok(res, { quote });
}
