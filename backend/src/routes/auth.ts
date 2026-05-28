import fs from "fs";
import { Router } from "express";
import multer from "multer";
import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { ethers } from "ethers";
import type { CircleCredentials } from "../config/env";
import { HttpError } from "../lib/errors";
import { toPublicUser } from "../lib/userPublic";
import { requireAuth } from "../middleware/auth";
import { requireOnboarded } from "../middleware/onboarding";
import {
  createLoginChallenge,
  issueSessionToken,
  verifyLoginSignature,
} from "../services/auth";
import { provisionCustodialWalletOnArc } from "../services/circleWallet";
import {
  createAvatarUploader,
  publicUrlForUpload,
  removeStoredImage,
} from "../lib/uploadAvatar";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;

export function createAuthRouter(
  db: PrismaClient,
  jwtSecret: string,
  opts: {
    circle: CircleCredentials | undefined;
    circleConfigured: boolean;
    uploadsDir: string;
  }
): Router {
  const { circle, circleConfigured, uploadsDir } = opts;
  const avatarUpload = createAvatarUploader(uploadsDir);
  const router = Router();

  router.post("/challenge", async (req, res, next) => {
    try {
      const walletAddress = req.body?.walletAddress as string | undefined;
      if (!walletAddress || !ethers.isAddress(walletAddress)) {
        throw new HttpError("walletAddress must be a valid address", 400);
      }
      const out = await createLoginChallenge(db, walletAddress);
      res.json(out);
    } catch (e) {
      next(e);
    }
  });

  router.post("/verify", async (req, res, next) => {
    try {
      const walletAddress = req.body?.walletAddress as string | undefined;
      const signature = req.body?.signature as string | undefined;
      const nonce = req.body?.nonce as string | undefined;
      if (!walletAddress || !signature || !nonce) {
        throw new HttpError(
          "walletAddress, signature, and nonce are required",
          400
        );
      }
      const user = await verifyLoginSignature(db, {
        walletAddress,
        signature,
        nonce,
      });
      const token = issueSessionToken(jwtSecret, user);
      res.json({
        token,
        user: toPublicUser(user, { circleConfigured }),
      });
    } catch (e) {
      next(e);
    }
  });

  router.get("/me", requireAuth, async (req, res, next) => {
    try {
      const user = await db.user.findUnique({
        where: { id: req.auth!.userId },
      });
      if (!user) {
        throw new HttpError("User not found", 404);
      }
      res.json({
        ...toPublicUser(user, { circleConfigured }),
        createdAt: user.createdAt.toISOString(),
      });
    } catch (e) {
      next(e);
    }
  });

  router.post("/onboarding", requireAuth, async (req, res, next) => {
    try {
      const username = req.body?.username as string | undefined;
      if (typeof username !== "string" || !USERNAME_RE.test(username)) {
        throw new HttpError(
          "username must be 3–32 chars: letters, numbers, underscore",
          400
        );
      }
      const id = req.auth!.userId;
      const existing = await db.user.findUnique({ where: { id } });
      if (!existing) {
        throw new HttpError("User not found", 404);
      }
      if (existing.username && existing.username !== username) {
        throw new HttpError(
          "Username already set; use PATCH /auth/profile to change it",
          400
        );
      }

      let user = existing;
      if (!existing.username) {
        try {
          user = await db.user.update({
            where: { id },
            data: { username },
          });
        } catch (e: unknown) {
          if (
            e instanceof PrismaClientKnownRequestError &&
            e.code === "P2002"
          ) {
            next(new HttpError("Username already taken", 409));
            return;
          }
          throw e;
        }
      }

      if (
        circle &&
        (!user.circleWalletId || !user.circleWalletAddress)
      ) {
        const created = await provisionCustodialWalletOnArc(circle, id);
        user = await db.user.update({
          where: { id },
          data: {
            circleWalletId: created.walletId,
            circleWalletAddress: created.address,
          },
        });
      }

      res.json({ user: toPublicUser(user, { circleConfigured }) });
    } catch (e) {
      next(e);
    }
  });

  router.patch(
    "/profile",
    requireAuth,
    requireOnboarded(db, circleConfigured),
    async (req, res, next) => {
      try {
        const username = req.body?.username as string | undefined;
        if (username === undefined) {
          throw new HttpError("username is required", 400);
        }
        const data: Prisma.UserUpdateInput = {};
        if (typeof username !== "string" || !USERNAME_RE.test(username)) {
          throw new HttpError(
            "username must be 3–32 chars: letters, numbers, underscore",
            400
          );
        }
        data.username = username;
        const id = req.auth!.userId;
        try {
          const user = await db.user.update({
            where: { id },
            data,
          });
          res.json({
            user: toPublicUser(user, { circleConfigured }),
          });
        } catch (e: unknown) {
          if (
            e instanceof PrismaClientKnownRequestError &&
            e.code === "P2002"
          ) {
            next(new HttpError("Username already taken", 409));
            return;
          }
          throw e;
        }
      } catch (e) {
        next(e);
      }
    }
  );

  router.post(
    "/avatar",
    requireAuth,
    requireOnboarded(db, circleConfigured),
    (req, res, next) => {
      avatarUpload.single("image")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            next(new HttpError("Image too large (max 5MB)", 400));
            return;
          }
          next(new HttpError(err.message, 400));
          return;
        }
        next(err);
      });
    },
    async (req, res, next) => {
      try {
        if (!req.file) {
          throw new HttpError(
            "Provide an image file in field \"image\" (JPEG, PNG, WebP, GIF)",
            400
          );
        }
        const id = req.auth!.userId;
        const prev = await db.user.findUnique({ where: { id } });
        if (!prev) {
          throw new HttpError("User not found", 404);
        }
        const publicUrl = await publicUrlForUpload(
          req.file,
          uploadsDir,
          "avatar",
          id
        );
        try {
          const user = await db.user.update({
            where: { id },
            data: { avatarUrl: publicUrl },
          });
          await removeStoredImage(uploadsDir, prev.avatarUrl);
          console.log(`[avatar] saved user=${id} url=${publicUrl}`);
          res.json({ user: toPublicUser(user, { circleConfigured }) });
        } catch (e) {
          if (req.file.path) fs.unlink(req.file.path, () => {});
          throw e;
        }
      } catch (e) {
        next(e);
      }
    }
  );

  return router;
}
