import { z } from 'zod';

export const createProductSchema = z.object({
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(200),
  category: z.enum(['PANEL','INVERTER','BATTERY','CHARGE_CONTROLLER','MOUNTING_STRUCTURE','DC_BOX','AC_BOX','CABLE','EARTHING','CONNECTOR','ACCESSORY','SERVICE']),
  brand: z.string().max(100).optional(),
  specs: z.record(z.unknown()).optional(),
  unit: z.enum(['PCS','METER','SET','HOUR']).default('PCS'),
  isSerialized: z.boolean().default(false),
  warrantyMonths: z.number().int().min(0).default(12),
  costPrice: z.number().min(0),
  sellPrice: z.number().min(0),
  taxPercent: z.number().min(0).max(100).default(18),
  reorderLevel: z.number().int().min(0).default(0),
});

export const updateProductSchema = createProductSchema.partial().omit({ sku: true });

export const adjustStockSchema = z.object({
  delta: z.number().int(),
  reason: z.string().max(500).optional(),
});

export const listProductsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  isSerialized: z.union([z.boolean(), z.string()]).optional(),
  isActive: z.union([z.boolean(), z.string()]).optional(),
  search: z.string().max(200).optional(),
});
