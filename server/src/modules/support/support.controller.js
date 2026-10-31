import { asyncHandler } from '../../core/asyncHandler.js';
import { ok } from '../../core/response.js';
import { supportLookup, getCustomer360, checkWarranty, getSupportDashboard } from './support.service.js';
import { z } from 'zod';

export const lookupHandler = asyncHandler(async (req, res) => {
  const { q } = z.object({ q: z.string().min(1).max(200) }).parse(req.query);
  const results = await supportLookup(q);
  ok(res, results);
});

export const getCustomer360Handler = asyncHandler(async (req, res) => {
  const customer = await getCustomer360(req.params.customerId);
  ok(res, customer);
});

export const checkWarrantyHandler = asyncHandler(async (req, res) => {
  const result = await checkWarranty(req.params.serialNumber);
  ok(res, result);
});

export const getDashboardHandler = asyncHandler(async (req, res) => {
  const stats = await getSupportDashboard();
  ok(res, stats);
});
