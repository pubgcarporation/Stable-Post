import { ethers } from "ethers";
import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import type { CircleCredentials } from "../config/env";
import { HttpError } from "../lib/errors";
import { toPublicUser } from "../lib/userPublic";
import { requireAuth } from "../middleware/auth";
import { requireUsernameSet } from "../middleware/onboarding";
import {
  executeCustodialTip,
  executeWithdrawFromCustodialWallet,
  provisionCustodialWalletOnArc,
} from "../services/circleWallet";

export function createWalletRouter(
  db: PrismaClient,
  circle: CircleCredentials | undefined,
  opts: {
    stablePostAddress: string;
    usdcAddress: string | undefined;
    provider: ethers.JsonRpcProvider;
  }
) {
  const { stablePostAddress, usdcAddress, provider } = opts;
  const router = Router();

  router.post(
    "/circle/provision",
    requireAuth,
    requireUsernameSet(db),
    async (req, res, next) => {
      try {
        if (!circle) {
          throw new HttpError(
            "Custodial wallets not configured (set CIRCLE_* env vars)",
            503
          );
        }
        const userId = req.auth!.userId;
        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user) throw new HttpError("User not found", 404);

        if (user.circleWalletAddress) {
          res.json({ user: toPublicUser(user, { circleConfigured: !!circle }) });
          return;
        }

        const created = await provisionCustodialWalletOnArc(circle, userId);
        const updated = await db.user.update({
          where: { id: userId },
          data: {
            circleWalletId: created.walletId,
            circleWalletAddress: created.address,
          },
        });

        res.json({ user: toPublicUser(updated, { circleConfigured: !!circle }) });
      } catch (e) {
        next(e);
      }
    }
  );

  router.post("/circle/tip", requireAuth, async (req, res, next) => {
    try {
      if (!circle) {
        throw new HttpError(
          "Custodial wallets not configured (set CIRCLE_* env vars)",
          503
        );
      }
      if (!usdcAddress) {
        throw new HttpError(
          "USDC_ADDRESS not configured on server",
          503
        );
      }

      const postId = req.body?.postId;
      const amount = req.body?.amount as string | undefined;

      if (!postId || typeof postId !== "string") {
        throw new HttpError("postId is required", 400);
      }
      if (!amount || typeof amount !== "string" || isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new HttpError("amount must be a positive number string", 400);
      }

      const userId = req.auth!.userId;
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) throw new HttpError("User not found", 404);
      if (!user.circleWalletId || !user.circleWalletAddress) {
        throw new HttpError("Custodial wallet not provisioned for this user", 400);
      }

      const post = await db.post.findUnique({ where: { id: postId } });
      if (!post) throw new HttpError("Post not found", 404);

      if (post.creatorAddress.toLowerCase() === user.walletAddress.toLowerCase()) {
        throw new HttpError("You cannot tip your own post", 400);
      }

      const usdcContract = new ethers.Contract(
        usdcAddress,
        ["function decimals() view returns (uint8)"],
        provider
      );
      const decimals = (await usdcContract.decimals()) as number;
      const amountWei = ethers.parseUnits(amount, decimals);

      const result = await executeCustodialTip(circle, {
        walletId: user.circleWalletId,
        walletAddress: user.circleWalletAddress,
        creatorAddress: post.creatorAddress,
        postId: post.onChainPostId,
        amountWei,
        usdcAddress,
        stablePostAddress,
        provider,
      });

      await db.post.update({
        where: { id: postId },
        data: {
          tipCount: { increment: 1 },
          tipTotal: { increment: Number(amount) },
        },
      });

      await db.tip.create({
        data: {
          recipientAddress: post.creatorAddress,
          fromAddress: user.circleWalletAddress ?? user.walletAddress,
          postId,
          amount: Number(amount),
        },
      });

      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  router.post("/circle/withdraw", requireAuth, async (req, res, next) => {
    try {
      if (!circle) {
        throw new HttpError("Custodial wallets not configured (set CIRCLE_* env vars)", 503);
      }
      if (!usdcAddress) {
        throw new HttpError("USDC_ADDRESS not configured on server", 503);
      }

      const { amount, toAddress } = req.body as {
        amount?: string;
        toAddress?: string;
      };

      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new HttpError("amount must be a positive number string", 400);
      }

      const userId = req.auth!.userId;
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) throw new HttpError("User not found", 404);
      if (!user.circleWalletId || !user.circleWalletAddress) {
        throw new HttpError("Custodial wallet not provisioned", 400);
      }

      const dest = (toAddress ?? "").trim() || user.walletAddress;
      if (!ethers.isAddress(dest)) {
        throw new HttpError("Invalid destination address", 400);
      }

      const result = await executeWithdrawFromCustodialWallet(circle, {
        walletAddress: user.circleWalletAddress,
        toAddress: dest,
        amount,
        usdcAddress,
      });

      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  router.get("/earnings-history", requireAuth, async (req, res, next) => {
    try {
      const userId = req.auth!.userId;
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) throw new HttpError("User not found", 404);

      const period = (req.query.period as string) || "1w";
      const now = new Date();

      let bucketMs: number;
      let bucketCount: number;
      let startDate: Date;

      if (period === "1d") {
        bucketMs = 2 * 60 * 60 * 1000;
        bucketCount = 12;
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      } else if (period === "1m") {
        bucketMs = 3 * 24 * 60 * 60 * 1000;
        bucketCount = 10;
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else {
        bucketMs = 24 * 60 * 60 * 1000;
        bucketCount = 7;
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const tips = await db.tip.findMany({
        where: {
          recipientAddress: user.walletAddress,
          createdAt: { gte: startDate },
        },
        select: { amount: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      });

      const buckets: { label: string; amount: number }[] = [];
      for (let i = 0; i < bucketCount; i++) {
        const bucketStart = new Date(startDate.getTime() + i * bucketMs);
        const bucketEnd = new Date(bucketStart.getTime() + bucketMs);
        const total = tips
          .filter(
            (t) => t.createdAt >= bucketStart && t.createdAt < bucketEnd
          )
          .reduce((sum, t) => sum + t.amount, 0);

        let label: string;
        if (period === "1d") {
          label = bucketStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
        } else {
          label = bucketStart.toLocaleDateString([], { month: "short", day: "numeric" });
        }
        buckets.push({ label, amount: Number(total.toFixed(4)) });
      }

      res.json({ points: buckets });
    } catch (e) {
      next(e);
    }
  });

  return router;
}
