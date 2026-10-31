import { asyncHandler } from '../../core/asyncHandler.js';
import { ok, created } from '../../core/response.js';
import { listProducts, getProduct, createProduct, updateProduct, adjustStock } from './products.service.js';
import { createProductSchema, updateProductSchema, adjustStockSchema, listProductsSchema } from './products.validation.js';

export const listProductsHandler = asyncHandler(async (req, res) => {
  const query = listProductsSchema.parse(req.query);
  const { rows, meta } = await listProducts(query);
  ok(res, rows, meta);
});

export const getProductHandler = asyncHandler(async (req, res) => {
  const product = await getProduct(req.params.id);
  ok(res, product);
});

export const createProductHandler = asyncHandler(async (req, res) => {
  const data = createProductSchema.parse(req.body);
  const product = await createProduct(data);
  created(res, product);
});

export const updateProductHandler = asyncHandler(async (req, res) => {
  const data = updateProductSchema.parse(req.body);
  const product = await updateProduct(req.params.id, data);
  ok(res, product);
});

export const adjustStockHandler = asyncHandler(async (req, res) => {
  const { delta, reason } = adjustStockSchema.parse(req.body);
  const product = await adjustStock(req.params.id, delta, reason);
  ok(res, product);
});
