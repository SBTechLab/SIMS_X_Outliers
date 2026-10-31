import cron from 'node-cron';
import { env } from '../config/env.js';
import { logger } from '../core/logger.js';
import { expireQuotes } from './expireQuotes.job.js';
import { flagOverdueLeads } from './overdueLeads.job.js';
import { warrantyExpiryAlerts } from './warrantyAlerts.job.js';

/** IST, because every schedule below is stated in the company's working day. */
const TZ = 'Asia/Kolkata';

/**
 * Registers every cron schedule, once, at boot.
 *
 * Why: a job registered inside a request handler would be re-registered on every call.
 *      This is called from server.js before the port opens.
 * Flow: schedule each job, wrapping it so a failure is logged and the schedule survives.
 * Example:
 *   registerJobs()
 *   // → logs { jobs: ["expireQuotes", "overdueLeads", "warrantyAlerts"] }
 * Throws: nothing.
 */
export function registerJobs() {
  if (env.isTest) return;

  const run = (name, fn) => async () => {
    try {
      const result = await fn();
      logger.info({ job: name, result }, 'cron job finished');
    } catch (err) {
      // A failed run must not kill the schedule — the next tick should still fire.
      logger.error({ err, job: name }, 'cron job failed');
    }
  };

  // 00:20 IST — after midnight, so validUntil comparisons use a clean day boundary.
  cron.schedule('20 0 * * *', run('expireQuotes', expireQuotes), { timezone: TZ });

  // Hourly on the half hour — BR-02's 24h flag only needs this resolution.
  cron.schedule('30 * * * *', run('overdueLeads', flagOverdueLeads), { timezone: TZ });

  // 08:00 IST — support sees expiring warranties at the start of the working day.
  cron.schedule('0 8 * * *', run('warrantyAlerts', warrantyExpiryAlerts), { timezone: TZ });

  logger.info(
    { jobs: ['expireQuotes', 'overdueLeads', 'warrantyAlerts'], timezone: TZ },
    'registered cron jobs',
  );
}
