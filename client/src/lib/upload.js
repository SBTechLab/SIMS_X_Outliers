/** Mirrors server/src/core/upload.js so the client rejects before a request is even sent. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_FILES = 10;
export const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

