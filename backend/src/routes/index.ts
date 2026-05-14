import type { Express } from "express";
import type { Contract, JsonRpcProvider } from "ethers";
import type { PrismaClient } from "@prisma/client";
import type { CircleCredentials } from "../config/env";
import { healthRouter } from "./health";
import { createPostsRouter } from "./posts";
import { createUsersRouter } from "./users";
import { createAuthRouter } from "./auth";
import { createWalletRouter } from "./wallet";

export function registerRoutes(
  app: Express,
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
  app.use((_req, res, next) => {
    res.locals.jwtSecret = deps.jwtSecret;
    next();
  });

  app.use("/health", healthRouter);
  const circleConfigured = deps.circle !== undefined;
  app.use(
    "/auth",
    createAuthRouter(deps.prisma, deps.jwtSecret, {
      circle: deps.circle,
      circleConfigured,
      uploadsDir: deps.uploadsDir,
    })
  );
  app.use(
    "/wallet",
    createWalletRouter(deps.prisma, deps.circle, {
      stablePostAddress: deps.stablePostAddress,
      usdcAddress: deps.usdcAddress,
      provider: deps.provider,
    })
  );
  app.use(
    "/posts",
    createPostsRouter(stablePost, deps.prisma, circleConfigured, deps.uploadsDir)
  );
  app.use(
    "/users",
    createUsersRouter(stablePost, deps.prisma, circleConfigured)
  );
}
