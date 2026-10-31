import { z } from 'zod';

/** The company block printed on every quote, invoice and packing slip. */
const companySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    gstin: z.string().trim().max(20).optional(),
    address: z.string().trim().max(240).optional(),
    phone: z.string().trim().max(30).optional(),
    email: z.string().trim().email().max(120).optional(),
  })
  .strict();

const percent = z.coerce.number().min(0).max(100);
const money = z.coerce.number().min(0).max(9999999);
const days = z.coerce.number().int().min(1).max(365);
const hours = z.coerce.number().int().min(1).max(8760);

/**
 * PUT /settings body.
 *
 * .strict() is deliberate: a typo like `advancePercentage` must fail loudly rather than be
 * silently ignored, which would leave the order-confirmation gate at its old value (BR-05).
 */
export const updateSettings = z
  .object({
    company: companySchema.optional(),
    advancePercent: percent.optional(),
    defaultTaxPercent: percent.optional(),
    labourRatePerHour: money.optional(),
    serviceVisitCharge: money.optional(),
    quoteValidityDays: days.optional(),
    surveySlaHours: hours.optional(),
    warrantyExpiryAlertDays: days.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one setting to update.' });
