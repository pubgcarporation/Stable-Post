import fs from "fs";
import path from "path";
import type { Request } from "express";
import multer from "multer";

export const UPLOADS_DIRNAME = "uploads";

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

export function ensureUploadsDir(root = process.cwd()): string {
  const dir = path.join(root, UPLOADS_DIRNAME);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function removeUploadFile(uploadsDir: string, publicUrl: string | null | undefined) {
  if (!publicUrl?.startsWith(`/${UPLOADS_DIRNAME}/`)) return;
  const file = path.join(uploadsDir, path.basename(publicUrl));
  fs.unlink(file, () => {});
}

function createUploader(uploadsDir: string, prefix: string) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req: Request, file, cb) => {
      const raw = path.extname(file.originalname).toLowerCase();
      const ext = ALLOWED_EXT.has(raw) ? raw : ".jpg";
      cb(null, `${prefix}-${req.auth!.userId}-${Date.now()}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ok = /^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype);
      cb(null, ok);
    },
  });
}

export function createAvatarUploader(uploadsDir: string) {
  return createUploader(uploadsDir, "avatar");
}

export function createPostImageUploader(uploadsDir: string) {
  return createUploader(uploadsDir, "post");
}
