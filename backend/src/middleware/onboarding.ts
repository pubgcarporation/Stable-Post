import type { NextFunction, Request, Response } from "express";
import type { PrismaClient } from "@prisma/client";
import { HttpError } from "../lib/errors";

export function requireUsernameSet(db: PrismaClient) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const userId = req.auth!.userId;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      next(new HttpError("User not found", 404));
      return;
    }
    if (!user.username?.trim()) {
      next(
        new HttpError(
          "Set a username via POST /auth/onboarding first",
          403,
          "USERNAME_REQUIRED"
        )
      );
      return;
    }
    next();
  };
}

export function requireOnboarded(
  db: PrismaClient,
  circleConfigured: boolean
) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const userId = req.auth!.userId;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      next(new HttpError("User not found", 404));
      return;
    }
    if (!user.username?.trim()) {
      next(
        new HttpError(
          "Complete onboarding: choose a username",
          403,
          "ONBOARDING_REQUIRED"
        )
      );
      return;
    }
    if (circleConfigured && !user.circleWalletAddress) {
      next(
        new HttpError(
          "Complete onboarding: custodial wallet not ready",
          403,
          "ONBOARDING_REQUIRED"
        )
      );
      return;
    }
    next();
  };
}
