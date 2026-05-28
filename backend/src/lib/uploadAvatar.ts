import fs from "fs";
import path from "path";
import type { Request, RequestHandler } from "express";
import multer from "multer";

export const UPLOADS_DIRNAME = "uploads";

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

/** Local default: `{root}/uploads`. If `UPLOADS_DIR` is set, use that path as-is (no extra `/uploads`). */
export function resolveUploadsDir(defaultRoot: string): string {
  const envDir = process.env.UPLOADS_DIR?.trim();
  const dir = envDir || path.join(defaultRoot, UPLOADS_DIRNAME);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function removeUploadFile(uploadsDir: string, publicUrl: string | null | undefined) {
  if (!publicUrl?.startsWith(`/${UPLOADS_DIRNAME}/`)) return;
  const file = path.join(uploadsDir, path.basename(publicUrl));
  fs.unlink(file, () => {});
}

export function createUploadsHandler(uploadsDir: string): RequestHandler {
  return (req, res) => {
    const name = path.basename(req.path);
    if (!name || name === "." || name.includes("..")) {
      res.sendStatus(400);
      return;
    }
    res.sendFile(path.join(uploadsDir, name), (err) => {
      if (err) res.sendStatus(404);
    });
  };
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
