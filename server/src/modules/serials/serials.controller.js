import { asyncHandler } from '../../core/asyncHandler.js';
import { ok } from '../../core/response.js';
import { listSerials, getSerialByNumber, getSerialById } from './serials.service.js';
import { z } from 'zod';

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  productId: z.string().optional(),
  projectId: z.string().optional(),
  search: z.string().max(200).optional(),
});

export const listSerialsHandler = asyncHandler(async (req, res) => {
  const query = listQuery.parse(req.query);
  const { rows, meta } = await listSerials(query);
  ok(res, rows, meta);
});

export const getSerialByNumberHandler = asyncHandler(async (req, res) => {
  const serial = await getSerialByNumber(req.params.serialNumber);
  ok(res, serial);
});

export const getSerialByIdHandler = asyncHandler(async (req, res) => {
  const serial = await getSerialById(req.params.id);
  ok(res, serial);
});
