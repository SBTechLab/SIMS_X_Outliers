import { prisma } from '../core/prisma.js';
import { notifyRole } from '../core/notify.js';
import { getSetting } from '../modules/settings/settings.service.js';

/**
 * Warns support about warranties expiring soon.
 *
 * Why: a customer whose inverter warranty lapses next week is a conversation worth having
 *      before it lapses, not after. The window comes from
 *      settings.warrantyExpiryAlertDays — never a literal (BR-14).
 * Flow: read the alert window -> find warranties ending inside it that are not void ->
 *       notify SUPPORT_EXECUTIVE with a count, and the detail of the first few.
 * Example:
 *   await warrantyExpiryAlerts()
 *   // → { expiring: 4, notified: 1 }
 * Throws: nothing of its own.
 */
export async function warrantyExpiryAlerts() {
  const days = Number(await getSetting('warrantyExpiryAlertDays')) || 30;

  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const expiring = await prisma.warranty.findMany({
    where: {
      voidReason: null,
      endDate: { gte: now, lte: until },
    },
    select: {
      endDate: true,
      serialUnit: { select: { serialNumber: true, product: { select: { name: true } } } },
      customer: { select: { name: true, phone: true } },
      project: { select: { code: true } },
    },
    orderBy: { endDate: 'asc' },
  });

  if (expiring.length === 0) return { expiring: 0, notified: 0 };

  const first = expiring[0];
  const result = await notifyRole('SUPPORT_EXECUTIVE', {
    title: `${expiring.length} warrant${expiring.length === 1 ? 'y' : 'ies'} expiring within ${days} days`,
    body: `Earliest: ${first.serialUnit.product.name} ${first.serialUnit.serialNumber} for ${first.customer.name} (${first.project.code}).`,
    link: `/support/warranties?expiringInDays=${days}`,
  });

  return { expiring: expiring.length, notified: result.created };
}
