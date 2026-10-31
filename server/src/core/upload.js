import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from './AppError.js';
import { prisma } from './prisma.js';

/**
 * File uploads to local disk with random names (D-04, SECURITY.md section 8).
 *
 * The user-supplied filename never touches the filesystem — that is what closes the
 * path-traversal and overwrite classes of bug by construction.
 */

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_FILES = 10;

/** Both the MIME type and the extension must match, so a .exe renamed to .jpg fails. */
const ALLOWED = Object.freeze({
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
});

export const UPLOAD_ROOT = resolve(process.cwd(), env.UPLOAD_DIR);

if (!existsSync(UPLOAD_ROOT)) mkdirSync(UPLOAD_ROOT, { recursive: true });

/** 16 random bytes plus the validated extension. 128 bits is unguessable. */
function randomFileName(originalName) {
  return `${randomBytes(16).toString('hex')}${extname(originalName).toLowerCase()}`;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_ROOT),
  filename: (_req, file, cb) => cb(null, randomFileName(file.originalname)),
});

function fileFilter(_req, file, cb) {
  const allowedExts = ALLOWED[file.mimetype];
  if (!allowedExts) {
    return cb(
      new AppError(422, 'INVALID_FILE_TYPE', `${file.originalname} is not a JPG, PNG, WebP or PDF.`),
    );
  }
  if (!allowedExts.includes(extname(file.originalname).toLowerCase())) {
    return cb(
      new AppError(
        422,
        'INVALID_FILE_TYPE',
        `${file.originalname} has an extension that does not match its content.`,
      ),
    );
  }
  return cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
});

/** Repeatable `files` field, the convention for every multipart endpoint. */
export const uploadFiles = upload.array('files', MAX_FILES);

/**
 * Records uploaded files as Attachment rows.
 *
 * Why: a file on disk with no row (or a row with no parent) must not happen — an orphan
 *      file would otherwise count toward BR-10's three-photo requirement. Pass `tx` so the
 *      attachments and the parent change commit together.
 * Flow: map multer files to Attachment rows, insert, return them.
 * Example:
 *   const attachments = await saveAttachments(req.files, {
 *     entityType: "INSTALLATION", entityId: job.id, kind: "PHOTO", uploadedById: user.id,
 *   }, tx)
 *   // → [{ id: "att_91", fileUrl: "/uploads/8f2c....jpg", ... }]
 * Throws: nothing of its own; a Prisma failure propagates so the transaction rolls back.
 */
export async function saveAttachments(
  files,
  { entityType, entityId, kind = 'PHOTO', uploadedById = null },
  client = prisma,
) {
  if (!files || files.length === 0) return [];

  const rows = files.map((file) => ({
    entityType,
    entityId,
    fileUrl: `/uploads/${file.filename}`,
    // The original name is kept for display only — never used on disk.
    fileName: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    kind,
    uploadedById,
  }));

  await client.attachment.createMany({ data: rows });

  return client.attachment.findMany({
    where: { entityType, entityId, kind },
    orderBy: { createdAt: 'desc' },
    take: rows.length,
  });
}

/**
 * Stores a base64 data URL (the customer signature) as a file plus an Attachment row.
 *
 * Why: BR-10 requires a signature, and the signature pad produces a data URL rather than a
 *      file upload. It goes through the same random-name path as every other file.
 * Flow: validate the image/png prefix, decode, cap the size, write to UPLOAD_ROOT,
 *       create the Attachment row.
 * Example:
 *   const att = await saveDataUrl(signatureDataUrl, {
 *     entityType: "INSTALLATION", entityId: job.id, kind: "SIGNATURE", uploadedById: user.id,
 *   }, tx)
 *   // → { fileUrl: "/uploads/3a9f....png" }
 * Throws: AppError 422 INVALID_FILE_TYPE for a non-PNG data URL;
 *         AppError 422 FILE_TOO_LARGE when the decoded image exceeds 5 MB.
 */
export async function saveDataUrl(
  dataUrl,
  { entityType, entityId, kind = 'SIGNATURE', uploadedById = null, fileName = 'signature.png' },
  client = prisma,
) {
  const match = /^data:(image\/png|image\/jpeg);base64,(.+)$/s.exec(dataUrl ?? '');
  if (!match) {
    throw new AppError(422, 'INVALID_FILE_TYPE', 'The signature must be a PNG or JPEG data URL.');
  }

  const [, mimeType, base64] = match;
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length > MAX_FILE_BYTES) {
    throw new AppError(422, 'FILE_TOO_LARGE', 'The signature image is larger than 5 MB.');
  }

  const filename = `${randomBytes(16).toString('hex')}${mimeType === 'image/png' ? '.png' : '.jpg'}`;
  writeFileSync(join(UPLOAD_ROOT, filename), buffer);

  return client.attachment.create({
    data: {
      entityType,
      entityId,
      fileUrl: `/uploads/${filename}`,
      fileName,
      mimeType,
      sizeBytes: buffer.length,
      kind,
      uploadedById,
    },
  });
}

/** Counts attachments of a kind for an entity — BR-10's three-photo check reads this. */
export function countAttachments({ entityType, entityId, kind = 'PHOTO' }, client = prisma) {
  return client.attachment.count({ where: { entityType, entityId, kind } });
}
