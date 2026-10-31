import { env } from './config/env.js';
import { logger } from './core/logger.js';
import { prisma } from './core/prisma.js';
import { registerListeners } from './core/events.js';
import { registerJobs } from './jobs/index.js';
import { createApp } from './app.js';

/**
 * Boot order matters: listeners and cron jobs are attached BEFORE the port opens, so no
 * request can be served while a side effect is still unsubscribed.
 */
async function start() {
  await registerListeners();
  registerJobs();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV, client: env.allowedOrigins },
      `SunPower SIMS API listening on http://localhost:${env.PORT}/api/v1`,
    );
  });

  const shutdown = async (signal) => {
    logger.info({ signal }, 'shutting down');
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    // Do not hang forever if a connection refuses to close.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (err) => {
    logger.error({ err }, 'unhandled rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaught exception — exiting');
    process.exit(1);
  });
}

start().catch((err) => {
  logger.fatal({ err }, 'failed to start server');
  process.exit(1);
});
