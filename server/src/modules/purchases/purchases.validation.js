import { z } from 'zod';

export const createPurchaseSchema = z.object({
  supplierId: z.string().min(1),
  invoiceRef: z.string().max(100).optional(),
  purchasedAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1),
    unitCost: z.number().min(0),
    serials: z.array(z.string().min(1).max(100)).default([]),
  })).min(1),
});

export const createSupplierSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(20).optional(),
  gstin: z.string().max(20).optional(),
});
