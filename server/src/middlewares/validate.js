import { ZodError } from 'zod';
import { AppError } from '../core/AppError.js';

/**
 * Validates body, params and query with zod before the controller runs.
 *
 * Why: RULES.md section 4 — the server is the only enforcement point. A route that takes
 *      user input without validate() is a bug. Parsed values replace the originals, so
 *      controllers receive coerced numbers and dates rather than strings.
 * Flow: for each supplied schema, parse the matching request part and write the result back.
 *       On failure, collect every field error into one 422 rather than reporting only the first.
 * Example:
 *   validate({ params: v.idParam, body: v.scanBody })
 *   // → req.body.serialNumber is trimmed and upper-cased, or 422 with the field list
 * Throws: AppError 422 VALIDATION_ERROR with details.fields = [{ path, message }].
 */
export function validate(schemas = {}) {
  return function validator(req, _res, next) {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.body) req.body = schemas.body.parse(req.body);
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          new AppError(422, 'VALIDATION_ERROR', 'Please check the highlighted fields.', {
            fields: err.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          }),
        );
      }
      return next(err);
    }
  };
}

/**
 * Validates a multipart body, where every field arrives as a string.
 *
 * Why: multer parses the files, but text fields come through as strings, so the schema must
 *      coerce. Keeping this separate makes it obvious which routes are multipart.
 * Example:
 *   router.put("/:id/report", uploadFiles, validateMultipart({ body: v.reportBody }), ...)
 */
export function validateMultipart(schemas = {}) {
  return validate(schemas);
}
