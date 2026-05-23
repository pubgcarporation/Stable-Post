import cors from "cors";
import express from "express";
import type { Contract, JsonRpcProvider } from "ethers";
import type { PrismaClient } from "@prisma/client";
import type { CircleCredentials } from "./config/env";
import { registerRoutes } from "./routes";
import { HttpError } from "./lib/errors";
import { createUploadsHandler } from "./lib/uploadAvatar";

function corsOrigin(): boolean | string | string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) return true;
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length === 1 ? list[0] : list;
}

export function createApp(
  stablePost: Contract,
  deps: {
    prisma: PrismaClient;
    jwtSecret: string;
    circle: CircleCredentials | undefined;
    uploadsDir: string;
    stablePostAddress: string;
    usdcAddress: string | undefined;
    provider: JsonRpcProvider;
  }
) {
  const app = express();
  app.use(cors({ origin: corsOrigin(), credentials: true }));
  app.use(express.json({ limit: "256kb" }));
  app.use("/uploads", createUploadsHandler(deps.uploadsDir));

  registerRoutes(app, stablePost, deps);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if (err instanceof HttpError) {
        res.status(err.status).json({
          error: err.message,
          ...(err.code ? { code: err.code } : {}),
        });
        return;
      }
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  );

  return app;
}
