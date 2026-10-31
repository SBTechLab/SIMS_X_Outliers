import { asyncHandler } from '../../core/asyncHandler.js';
import { ok } from '../../core/response.js';
import { listWarranties, getWarranty, voidWarranty } from './warranties.service.js';
import { z } from 'zod';

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  customerId: z.string().optional(),
  projectId: z.string().optional(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'VOID']).optional(),
});

export const listWarrantiesHandler = asyncHandler(async (req, res) => {
  const query = listQuery.parse(req.query);
  const { rows, meta } = await listWarranties(query);
  ok(res, rows, meta);
});

export const getWarrantyHandler = asyncHandler(async (req, res) => {
  const warranty = await getWarranty(req.params.id);
  ok(res, warranty);
});

export const voidWarrantyHandler = asyncHandler(async (req, res) => {
  const { voidReason } = z.object({ voidReason: z.string().min(1) }).parse(req.body);
  const warranty = await voidWarranty(req.params.id, voidReason);
  ok(res, warranty);
});
