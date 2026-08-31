import path from "path";
import type { PrismaClient } from "@prisma/client";
import { loadEnv } from "./config/env";
import { initCloudinary, isCloudinaryEnabled } from "./lib/cloudinaryStorage";
import { resolveUploadsDir } from "./lib/uploadAvatar";
import { createStablePostReader } from "./services/chain";
import { createApp } from "./app";

export function bootApp(prisma: PrismaClient) {
  const env = loadEnv();
  initCloudinary();
  const uploadsDir = resolveUploadsDir(path.join(__dirname, ".."));
  const { stablePost, provider } = createStablePostReader(env);
  return {
    app: createApp(stablePost, {
      prisma,
      jwtSecret: env.jwtSecret,
      circle: env.circle,
      uploadsDir,
      stablePostAddress: env.stablePostAddress,
      usdcAddress: env.usdcAddress,
      provider,
    }),
    env,
    uploadsDir,
    prisma,
    cloudinary: isCloudinaryEnabled(),
  };
}
