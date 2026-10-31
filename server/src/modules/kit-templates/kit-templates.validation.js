import { z } from 'zod';

export const listTemplates = z.object({
  systemType: z.enum(['ON_GRID', 'OFF_GRID']).optional(),
  isActive: z.string().optional().transform((v) => (v === undefined ? undefined : v === 'true')),
  q: z.string().trim().optional(),
});

export const createTemplate = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  systemType: z.enum(['ON_GRID', 'OFF_GRID'], { errorMap: () => ({ message: 'systemType must be ON_GRID or OFF_GRID' }) }),
  capacityKw: z.number().positive('capacityKw must be positive'),
  description: z.string().trim().optional().nullable(),
  basePrice: z.number().nonnegative('basePrice must be non-negative'),
  isActive: z.boolean().optional().default(true),
});

export const updateTemplate = z.object({
  name: z.string().trim().min(2).optional(),
  systemType: z.enum(['ON_GRID', 'OFF_GRID']).optional(),
  capacityKw: z.number().positive().optional(),
  description: z.string().trim().optional().nullable(),
  basePrice: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

export const updateTemplateItems = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Product ID is required'),
      quantity: z.number().int().positive('Quantity must be an integer > 0'),
      notes: z.string().trim().optional().nullable(),
    }),
  ),
});

