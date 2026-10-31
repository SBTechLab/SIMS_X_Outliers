import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './core/logger.js';
import { AppError } from './core/AppError.js';
import { UPLOAD_ROOT } from './core/upload.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import apiRoutes from './routes.js';

/**
 * The Express app: the middleware chain in the exact order of docs/ARCHITECTURE.md section 3.
 * Kept separate from server.js so tests can import the app without opening a port.
 */
export function createApp() {
  const app = express();

  // Behind a proxy in production, so rate limits and audit IPs see the real client address.
  if (env.isProduction) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // 1. Security headers. The resource policy is relaxed only so the client can display
  //    images served from /uploads on a different origin.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false, // The API serves JSON and files, not HTML.
    }),
  );

  // 2. CORS as an allow-list, never origin: true (SECURITY.md section 3).
  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header: curl, the smoke script, server-to-server. Allowed.
        if (!origin || env.allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new AppError(403, 'CORS_BLOCKED', 'Origin not allowed.'));
      },
      credentials: true,
    }),
  );

  // 3. Cookies — the session arrives as sp_token (D-01).
  app.use(cookieParser());

  // 4. Body parsing. 2 MB covers a signature data URL; files go through multer instead.
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // 5. Request logging with a request id. Secrets are redacted in logger.js.
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/api/v1/health' },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );

  // Uploaded files, read-only. No directory listing, no dotfiles (SECURITY.md section 8).
  app.use(
    '/uploads',
    express.static(UPLOAD_ROOT, {
      index: false,
      dotfiles: 'deny',
      maxAge: '7d',
      fallthrough: true,
    }),
  );

  // 6. The API. Rate limits, requireAuth, requireRole and validate are applied per route.
  app.use('/api/v1', apiRoutes);

  // 7. Unmatched route, then the single error renderer.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
