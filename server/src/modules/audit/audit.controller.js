import * as service from './audit.service.js';
import { ok } from '../../core/response.js';

export async function list(req, res) {
  const result = await service.listAuditLogs(req.query);
  return ok(res, result.logs, result.meta);
}
