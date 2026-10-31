import { asyncHandler } from '../../core/asyncHandler.js';
import { ok } from '../../core/response.js';
import { getInventory, getLowStock } from './inventory.service.js';
import { z } from 'zod';

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  category: z.string().optional(),
});

export const getInventoryHandler = asyncHandler(async (req, res) => {
  const query = listQuery.parse(req.query);
  const { rows, meta } = await getInventory(query);
  ok(res, rows, meta);
});

export const getLowStockHandler = asyncHandler(async (req, res) => {
  const items = await getLowStock();
  ok(res, items);
});
