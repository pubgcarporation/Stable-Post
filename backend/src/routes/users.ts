import { Router } from "express";
import type { Contract } from "ethers";
import { ethers } from "ethers";
import type { PrismaClient } from "@prisma/client";
import { HttpError } from "../lib/errors";
import { toPublicUser } from "../lib/userPublic";

export function createUsersRouter(
  stablePost: Contract,
  db: PrismaClient,
  circleConfigured: boolean
) {
  const router = Router();

  router.get("/by-wallet/:address", async (req, res, next) => {
    try {
      let addr: string;
      try {
        addr = ethers.getAddress(req.params.address);
      } catch {
        throw new HttpError("Invalid wallet address", 400);
      }
      const user = await db.user.findUnique({
        where: { walletAddress: addr },
      });
      if (!user) {
        res.json({ registered: false });
        return;
      }
      res.json({
        registered: true,
        user: toPublicUser(user, { circleConfigured }),
      });
    } catch (e) {
      next(e);
    }
  });

  router.get("/by-username/:username", async (req, res, next) => {
    try {
      const user = await db.user.findUnique({
        where: { username: req.params.username },
      });
      if (!user) {
        throw new HttpError("Not found", 404);
      }
      res.json(toPublicUser(user, { circleConfigured }));
    } catch (e) {
      next(e);
    }
  });

  router.get("/:address/balance", async (req, res, next) => {
    try {
      let addr: string;
      try {
        addr = ethers.getAddress(req.params.address);
      } catch {
        throw new HttpError("Invalid wallet address", 400);
      }
      const balance = await stablePost.creatorBalances(addr);
      res.json({
        address: addr,
        creatorBalanceRaw: balance.toString(),
      });
    } catch (e) {
      next(e);
    }
  });

  return router;
}
