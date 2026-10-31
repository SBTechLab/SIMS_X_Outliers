import { asyncHandler } from '../../core/asyncHandler.js';
import { ok } from '../../core/response.js';
import { listDispatches, getDispatch, startPacking, scanSerial, packLine, markReady, dispatchGoods, recordDelivery } from './dispatches.service.js';
import { z } from 'zod';

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
});

const scanSchema = z.object({ serialNumber: z.string().min(1) });
const packLineSchema = z.object({ packedQty: z.number().min(0) });
const dispatchSchema = z.object({
  vehicleNo: z.string().min(1).max(30),
  driverName: z.string().min(1).max(100),
  driverPhone: z.string().max(20).optional(),
});
const deliverySchema = z.object({
  receivedByName: z.string().max(100).optional(),
  deliveredAt: z.string().datetime({ offset: true }).optional(),
});

export const listDispatchesHandler = asyncHandler(async (req, res) => {
  const query = listQuery.parse(req.query);
  const { rows, meta } = await listDispatches(query);
  ok(res, rows, meta);
});

export const getDispatchHandler = asyncHandler(async (req, res) => {
  const dispatch = await getDispatch(req.params.id);
  ok(res, dispatch);
});

export const startPackingHandler = asyncHandler(async (req, res) => {
  const dispatch = await startPacking(req.params.id, req.user.id);
  ok(res, dispatch);
});

export const scanSerialHandler = asyncHandler(async (req, res) => {
  const { serialNumber } = scanSchema.parse(req.body);
  const result = await scanSerial(req.params.id, serialNumber);
  ok(res, result);
});

export const packLineHandler = asyncHandler(async (req, res) => {
  const { packedQty } = packLineSchema.parse(req.body);
  const line = await packLine(req.params.id, req.params.lineId, packedQty);
  ok(res, line);
});

export const markReadyHandler = asyncHandler(async (req, res) => {
  const dispatch = await markReady(req.params.id);
  ok(res, dispatch);
});

export const dispatchGoodsHandler = asyncHandler(async (req, res) => {
  const data = dispatchSchema.parse(req.body);
  const dispatch = await dispatchGoods(req.params.id, data, req.user.id);
  ok(res, dispatch);
});

export const recordDeliveryHandler = asyncHandler(async (req, res) => {
  const data = deliverySchema.parse(req.body);
  const dispatch = await recordDelivery(req.params.id, data);
  ok(res, dispatch);
});
