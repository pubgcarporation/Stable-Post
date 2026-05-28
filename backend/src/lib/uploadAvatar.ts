import fs from "fs";
import path from "path";
import type { Request, RequestHandler } from "express";
import multer from "multer";

export const UPLOADS_DIRNAME = "uploads";

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function ensureDir(dir: string): void {
  if (fs.existsSync(dir)) {
    if (!fs.statSync(dir).isDirectory()) {
      throw Object.assign(new Error(`Not a directory: ${dir}`), { code: "ENOTDIR" });
    }
    return;
  }
  fs.mkdirSync(dir, { recursive: true });
}

/** Local default: `{root}/uploads`. If `UPLOADS_DIR` is set, use that path as-is (no extra `/uploads`). */
export function resolveUploadsDir(defaultRoot: string): string {
  const fallback = path.join(defaultRoot, UPLOADS_DIRNAME);
  const envDir = process.env.UPLOADS_DIR?.trim();
  if (!envDir) {
    ensureDir(fallback);
    return fallback;
  }
  try {
    ensureDir(envDir);
    return envDir;
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as NodeJS.ErrnoException).code)
        : "UNKNOWN";
    console.warn(
      `[uploads] Cannot use UPLOADS_DIR=${envDir} (${code}). Using ${fallback}. ` +
        "Render Free cannot use persistent disks — upgrade the instance or remove UPLOADS_DIR."
    );
    ensureDir(fallback);
    return fallback;
  }
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
