import { v2 as cloudinary } from "cloudinary";
import type { Express } from "express";

export function isCloudinaryEnabled(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
    process.env.CLOUDINARY_API_KEY?.trim() &&
    process.env.CLOUDINARY_API_SECRET?.trim()
  );
}

export function initCloudinary(): void {
  if (!isCloudinaryEnabled()) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!.trim(),
    api_key: process.env.CLOUDINARY_API_KEY!.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET!.trim(),
    secure: true,
  });
}

export async function uploadImageFile(
  file: Express.Multer.File,
  folder: "avatars" | "posts",
  namePrefix: string,
  userId: string
): Promise<string> {
  if (!file.buffer?.length) {
    throw new Error("Missing image buffer");
  }
  const ext = file.originalname.match(/\.(jpe?g|png|webp|gif)$/i)?.[1]?.toLowerCase() ?? "jpg";
  const result = await cloudinary.uploader.upload(
    `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
    {
      folder: `stable-post/${folder}`,
      public_id: `${namePrefix}-${userId}-${Date.now()}`,
      format: ext === "jpeg" ? "jpg" : ext,
      resource_type: "image",
    }
  );
  console.log(`[cloudinary] uploaded ${folder}/${namePrefix} user=${userId}`);
  return result.secure_url;
}

export async function destroyCloudImage(url: string | null | undefined): Promise<void> {
  if (!url?.includes("res.cloudinary.com")) return;
  try {
    const afterUpload = url.split("/upload/")[1];
    if (!afterUpload) return;
    const withoutVersion = afterUpload.replace(/^v\d+\//, "");
    const publicId = withoutVersion.replace(/\.[a-zA-Z0-9]+$/, "");
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch {
    /* best-effort cleanup */
  }
}
