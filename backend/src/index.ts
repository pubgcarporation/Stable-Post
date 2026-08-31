import "dotenv/config";
import { prisma } from "./lib/prisma";
import { bootApp } from "./boot";

const { app, env, uploadsDir, cloudinary } = bootApp(prisma);

const server = app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
  console.log(
    cloudinary
      ? "Image storage: Cloudinary (persistent URLs)"
      : `Image storage: local disk (${uploadsDir})`
  );
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
