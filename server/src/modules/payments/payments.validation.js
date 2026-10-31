import { z } from 'zod';

const paymentModes = z.enum(['UPI', 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'CARD']);
const paymentTypes = z.enum(['ADVANCE', 'PARTIAL', 'FINAL', 'SERVICE']);

export const recordPayment = z.object({
  projectId: z.string().cuid().optional(),
  invoiceId: z.string().cuid().optional(),
  customerId: z.string().cuid(),
  amount: z.coerce.number().positive(),
  type: paymentTypes,
  mode: paymentModes,
  reference: z.string().trim().max(100).optional(),
  receivedAt: z.coerce.date(),
});

export const listPayments = z.object({
  projectId: z.string().cuid().optional(),
  customerId: z.string().cuid().optional(),
  type: paymentTypes.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const paymentId = z.object({ id: z.string().cuid() });
