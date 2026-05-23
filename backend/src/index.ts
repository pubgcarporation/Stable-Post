import path from "path";
import { loadEnv } from "./config/env";
import { prisma } from "./lib/prisma";
import { ensureUploadsDir } from "./lib/uploadAvatar";
import { createStablePostReader } from "./services/chain";
import { createApp } from "./app";

const env = loadEnv();
const uploadsRoot = process.env.UPLOADS_DIR?.trim() || path.join(__dirname, "..");
const uploadsDir = ensureUploadsDir(uploadsRoot);
const { stablePost, provider } = createStablePostReader(env);
const app = createApp(stablePost, {
  prisma,
  jwtSecret: env.jwtSecret,
  circle: env.circle,
  uploadsDir,
  stablePostAddress: env.stablePostAddress,
  usdcAddress: env.usdcAddress,
  provider,
});

const server = app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
  console.log(`Uploads directory: ${uploadsDir}`);
});

async function shutdown() {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  await prisma.$disconnect();
  process.exit(0);
}

function shutdownSafe() {
  shutdown().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

process.on("SIGINT", shutdownSafe);
process.on("SIGTERM", shutdownSafe);
