/**
 * Upload Middleware — Reusable Multer Configuration
 *
 * Creates tenant-scoped file upload handlers for any entity type.
 * Files are stored on disk at: server/public/uploads/{entityType}/
 * Filename format: {tenantId}_{uuid}_{timestamp}.{ext}
 *
 * Usage:
 *   import { createUpload } from '../middleware/uploadMiddleware';
 *   const upload = createUpload('items');
 *   router.post('/:id/image', upload.single('image'), handler);
 */

import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from '../core/errors';
import { TenantContext } from '../core/tenant/tenantContext';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allowed MIME types → file extensions
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Creates a multer upload middleware for a given entity type.
 * @param entityType - Subdirectory under uploads/ (e.g., 'items', 'patients')
 * @param maxSize - Max file size in bytes (default 5MB)
 */
export function createUpload(entityType: string, maxSize: number = MAX_FILE_SIZE) {
  const uploadDir = path.resolve(__dirname, '../../public/uploads', entityType);

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      // Get tenantId from AsyncLocalStorage context (set by middleware chain)
      let tenantId = 'unknown';
      try {
        const ctx = TenantContext.getContext();
        if (ctx?.tenantId) {
          tenantId = ctx.tenantId;
        }
      } catch {
        // If context not available, use 'unknown' — the file will still be unique via uuid
      }

      const ext = ALLOWED_IMAGE_TYPES[file.mimetype] || path.extname(file.originalname).toLowerCase();
      const filename = `${tenantId}_${uuidv4()}_${Date.now()}${ext}`;
      cb(null, filename);
    },
  });

  const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES[file.mimetype]) {
      cb(new ValidationError(
        'Invalid file type. Allowed: JPEG, PNG, WebP',
        [{ field: 'image', message: 'File must be JPEG, PNG, or WebP' }],
      ));
      return;
    }
    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxSize,
    },
  });
}
