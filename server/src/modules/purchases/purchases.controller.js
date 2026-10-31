import { asyncHandler } from '../../core/asyncHandler.js';
import { ok, created } from '../../core/response.js';
import { listPurchases, getPurchase, createPurchase, listSuppliers, createSupplier } from './purchases.service.js';
import { createPurchaseSchema, createSupplierSchema } from './purchases.validation.js';
import { z } from 'zod';

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  supplierId: z.string().optional(),
});

export const listPurchasesHandler = asyncHandler(async (req, res) => {
  const query = listQuery.parse(req.query);
  const { rows, meta } = await listPurchases(query);
  ok(res, rows, meta);
});

export const getPurchaseHandler = asyncHandler(async (req, res) => {
  const purchase = await getPurchase(req.params.id);
  ok(res, purchase);
});

export const createPurchaseHandler = asyncHandler(async (req, res) => {
  const data = createPurchaseSchema.parse(req.body);
  const purchase = await createPurchase(data, req.user.id);
  created(res, purchase);
});

export const listSuppliersHandler = asyncHandler(async (req, res) => {
  const suppliers = await listSuppliers();
  ok(res, suppliers);
});

export const createSupplierHandler = asyncHandler(async (req, res) => {
  const data = createSupplierSchema.parse(req.body);
  const supplier = await createSupplier(data);
  created(res, supplier);
});
