import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from '../core/AppError.js';
import { logger } from '../core/logger.js';

/**
 * The single place an error becomes a response.
 *
 * Why: RULES.md section 5 and SECURITY.md section 11 — one error shape, stable codes the UI
 *      can branch on, no stack traces in production, and no raw Prisma messages (which leak
 *      column and constraint names).
 * Flow: AppError passes through as-is; ZodError becomes 422; known Prisma and multer errors are
 *       mapped; anything else is logged with its stack and returned as a generic 500.
 */
// eslint-disable-next-line no-unused-vars -- Express identifies an error handler by arity (4).
export function errorHandler(err, req, res, _next) {
  const mapped = mapError(err);

  if (mapped.status >= 500) {
    logger.error({ err, path: req.originalUrl, method: req.method }, 'unhandled server error');
  } else {
    logger.warn(
      { code: mapped.code, path: req.originalUrl, method: req.method, userId: req.user?.id },
      mapped.message,
    );
  }

  const body = {
    success: false,
    error: {
      code: mapped.code,
      message: mapped.message,
      ...(mapped.details ? { details: mapped.details } : {}),
    },
  };

  // Never in production (SECURITY.md section 11).
  if (!env.isProduction && err?.stack) body.error.stack = err.stack;

  return res.status(mapped.status).json(body);
}

function mapError(err) {
  if (err instanceof AppError) {
    return { status: err.status, code: err.code, message: err.message, details: err.details };
  }

  if (err instanceof ZodError) {
    return {
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Please check the highlighted fields.',
      details: {
        fields: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    };
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return { status: 422, code: 'FILE_TOO_LARGE', message: 'Each file must be 5 MB or smaller.' };
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return { status: 422, code: 'TOO_MANY_FILES', message: 'Upload at most 10 files at a time.' };
    }
    return { status: 422, code: 'UPLOAD_FAILED', message: 'The file could not be uploaded.' };
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // The raw Prisma message names columns and constraints, so it is never passed through.
    switch (err.code) {
      case 'P2002':
        return {
          status: 409,
          code: 'DUPLICATE',
          message: 'A record with these details already exists.',
          details: { fields: err.meta?.target ?? null },
        };
      case 'P2025':
        return { status: 404, code: 'NOT_FOUND', message: 'Record not found.' };
      case 'P2003':
        return {
          status: 409,
          code: 'RELATED_RECORD_MISSING',
          message: 'A related record does not exist.',
        };
      case 'P2014':
        return {
          status: 409,
          code: 'RELATION_VIOLATION',
          message: 'This record is referenced elsewhere and cannot be changed.',
        };
      default:
        return { status: 500, code: 'DATABASE_ERROR', message: 'A database error occurred.' };
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return { status: 500, code: 'DATABASE_ERROR', message: 'A database error occurred.' };
  }

  if (err?.type === 'entity.too.large') {
    return { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'The request body is too large.' };
  }

  if (err?.type === 'entity.parse.failed') {
    return { status: 400, code: 'BAD_REQUEST', message: 'The request body is not valid JSON.' };
  }

  return { status: 500, code: 'INTERNAL_ERROR', message: 'Something failed on our side.' };
}
