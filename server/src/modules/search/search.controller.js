import { ok } from '../../core/response.js';
import { globalSearch } from './search.service.js';

export async function searchCtrl(req, res) {
  const results = await globalSearch(req.query.q, req.user);
  return ok(res, results);
}
