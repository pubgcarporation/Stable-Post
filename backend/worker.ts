import { env } from "cloudflare:workers";
import { handleAsNodeRequest } from "cloudflare:node";
import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { bootApp } from "./src/boot";

type WorkerEnv = {
  DB: D1Database;
  [key: string]: unknown;
};

let booted = false;

function applyEnv(cf: WorkerEnv) {
  for (const [key, value] of Object.entries(cf)) {
    if (typeof value === "string" && value) process.env[key] = value;
  }
  process.env.DATABASE_URL ||= "file:./dev.db";
}

export default {
  async fetch(request: Request) {
    const cf = env as WorkerEnv;
    applyEnv(cf);
    if (!booted) {
      const prisma = new PrismaClient({ adapter: new PrismaD1(cf.DB) });
      bootApp(prisma).app.listen(3000);
      booted = true;
    }
    return handleAsNodeRequest(3000, request);
  },
};
