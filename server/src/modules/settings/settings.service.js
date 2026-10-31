import { prisma } from '../../core/prisma.js';
import { AUDIT, logAudit } from '../../core/audit.js';

/**
 * Settings — every rate the business runs on, as key/value rows.
 *
 * Why this module exists: BR-14 — no percentage or rate is ever hard-coded. Changing
 * advancePercent from 30 to 50 must change the order-confirmation gate on the next request,
 * with no deploy and no restart.
 */

/** The eight keys, with the values a fresh install falls back to. */
export const SETTING_DEFAULTS = Object.freeze({
  company: {
    name: 'SunPower Solutions',
    gstin: '36AABCS1429P1ZV',
    address: 'Plot 14, Phase II, IDA Cherlapally, Hyderabad 500051, Telangana',
    phone: '+91 40 2712 4188',
    email: 'care@sunpower.in',
  },
  advancePercent: 30,
  defaultTaxPercent: 18,
  labourRatePerHour: 450,
  serviceVisitCharge: 500,
  quoteValidityDays: 15,
  surveySlaHours: 48,
  warrantyExpiryAlertDays: 30,
});

/**
 * Reads every setting as one flat object.
 *
 * Why: services read rates from here rather than from a literal (BR-14). Defaults fill any
 *      key a fresh database has not been seeded with, so a missing row never crashes a quote.
 * Flow: load all Setting rows, overlay them on SETTING_DEFAULTS.
 * Example:
 *   const { advancePercent } = await getSettings()
 *   // → 30
 * Throws: nothing.
 */
export async function getSettings(client = prisma) {
  const rows = await client.setting.findMany();
  const settings = { ...SETTING_DEFAULTS };

  for (const row of rows) {
    // value is Json, so a scalar setting comes back as a bare number or string.
    settings[row.key] = row.value;
  }

  return settings;
}

/**
 * Reads one setting.
 *
 * Example:
 *   await getSetting("advancePercent")
 *   // → 30
 */
export async function getSetting(key, client = prisma) {
  const settings = await getSettings(client);
  return settings[key];
}

/**
 * Updates one or more settings.
 *
 * Why: BR-18 — these values decide what every customer is charged, so the change is audited
 *      with before and after in the same transaction as the write.
 * Flow: read the current values for the keys being changed, upsert each one, write one audit
 *       row for the whole change, return the full settings object.
 * Example:
 *   await updateSettings({ advancePercent: 50 }, user, "127.0.0.1")
 *   // → { advancePercent: 50, defaultTaxPercent: 18, ... }
 * Throws: nothing of its own; validation already rejected unknown keys and out-of-range values.
 */
export async function updateSettings(patch, user, ip) {
  const keys = Object.keys(patch);
  const current = await getSettings();

  const before = {};
  for (const key of keys) before[key] = current[key] ?? null;

  const updated = await prisma.$transaction(async (tx) => {
    for (const key of keys) {
      await tx.setting.upsert({
        where: { key },
        create: { key, value: patch[key] },
        update: { value: patch[key] },
      });
    }

    await logAudit(
      {
        userId: user.id,
        action: AUDIT.SETTINGS_UPDATED,
        entityType: 'Setting',
        entityId: null,
        before,
        after: patch,
        ip,
      },
      tx,
    );

    return getSettings(tx);
  });

  return updated;
}
