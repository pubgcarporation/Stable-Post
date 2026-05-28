import { Router } from "express";
import type { Request, Response } from "express";
import type { Contract } from "ethers";
import type { Post as PostRow, Prisma, PrismaClient } from "@prisma/client";
import multer from "multer";
import { HttpError } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import { requireOnboarded } from "../middleware/onboarding";
import { verifyAccessToken } from "../lib/jwt";
import {
  createPostImageUploader,
  publicUrlForUpload,
} from "../lib/uploadAvatar";

const MAX_CONTENT_LENGTH = 50_000;

function postIdFromReq(req: { params: { id?: string | string[] } }): string {
  const raw = req.params.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (typeof id !== "string" || !id) {
    throw new HttpError("Invalid post id", 400);
  }
  return id;
}

function tryWalletFromReq(req: Request, res: Response): string | null {
  const secret = res.locals.jwtSecret as string | undefined;
  if (!secret) return null;
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : undefined;
  if (!token) return null;
  try {
    const { wallet } = verifyAccessToken(secret, token);
    return wallet;
  } catch {
    return null;
  }
}

function serializePost(
  p: PostRow,
  extra?: { likeCount: number; likedByMe: boolean }
) {
  return {
    id: p.id,
    onChainPostId: p.onChainPostId,
    creatorAddress: p.creatorAddress,
    content: p.content,
    imageUrl: p.imageUrl,
    createdAt: p.createdAt.toISOString(),
    likeCount: extra?.likeCount ?? 0,
    likedByMe: extra?.likedByMe ?? false,
  };
}

export function createPostsRouter(
  stablePost: Contract,
  db: PrismaClient,
  circleConfigured: boolean,
  uploadsDir: string
) {
  const router = Router();
  const postImageUpload = createPostImageUploader(uploadsDir);

  router.get("/", async (req, res, next) => {
    try {
      const callerWallet = tryWalletFromReq(req, res);
      const sort = (req.query.sort as string) || "latest";
      const period = req.query.period as string | undefined;

      let sinceDate: Date | undefined;
      if (period === "day") {
        sinceDate = new Date();
        sinceDate.setHours(0, 0, 0, 0);
      } else if (period === "week") {
        sinceDate = new Date(Date.now() - 7 * 86_400_000);
      } else if (period === "month") {
        sinceDate = new Date(Date.now() - 30 * 86_400_000);
      }

      const where = sinceDate ? { createdAt: { gte: sinceDate } } : {};

      let orderBy: Prisma.PostOrderByWithRelationInput;
      if (sort === "liked") {
        orderBy = { likes: { _count: "desc" } };
      } else if (sort === "tipped") {
        orderBy = { tipCount: "desc" };
      } else {
        orderBy = { createdAt: "desc" };
      }

      const rows = await db.post.findMany({
        where,
        orderBy,
        take: 50,
        include: { _count: { select: { likes: true } } },
      });

      let likedPostIds = new Set<string>();
      if (callerWallet && rows.length > 0) {
        const myLikes = await db.like.findMany({
          where: {
            walletAddress: callerWallet,
            postId: { in: rows.map((r) => r.id) },
          },
          select: { postId: true },
        });
        likedPostIds = new Set(myLikes.map((l) => l.postId));
      }

      res.json({
        posts: rows.map((r) =>
          serializePost(r, {
            likeCount: r._count.likes,
            likedByMe: likedPostIds.has(r.id),
          })
        ),
      });
    } catch (e) {
      next(e);
    }
  });

  router.post(
    "/",
    requireAuth,
    requireOnboarded(db, circleConfigured),
    async (req, res, next) => {
      try {
        const content = req.body?.content;
        const imageUrl = req.body?.imageUrl as string | undefined;

        if (typeof content !== "string" || !content.trim()) {
          throw new HttpError("content is required", 400);
        }
        if (content.length > MAX_CONTENT_LENGTH) {
          throw new HttpError(
            `content too long (max ${MAX_CONTENT_LENGTH} chars)`,
            400
          );
        }
        if (imageUrl != null && typeof imageUrl !== "string") {
          throw new HttpError("imageUrl must be a string", 400);
        }
        const normalizedImage =
          typeof imageUrl === "string" && imageUrl.trim()
            ? imageUrl.trim()
            : undefined;

        const wallet = req.auth!.walletAddress;
        const data: Prisma.PostUncheckedCreateInput = {
          creatorAddress: wallet,
          content: content.trim(),
          imageUrl: normalizedImage,
        };

        const row = await db.post.create({ data });
        res.status(201).json({ post: serializePost(row, { likeCount: 0, likedByMe: false }) });
      } catch (e) {
        next(e);
      }
    }
  );

  router.get("/liked", requireAuth, async (req, res, next) => {
    try {
      const wallet = req.auth!.walletAddress;
      const likes = await db.like.findMany({
        where: { walletAddress: wallet },
        include: {
          post: {
            include: { _count: { select: { likes: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      const posts = likes.map((l) =>
        serializePost(l.post, { likeCount: l.post._count.likes, likedByMe: true })
      );
      res.json({ posts });
    } catch (e) {
      next(e);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const postId = postIdFromReq(req);
      const callerWallet = tryWalletFromReq(req, res);

      const post = await db.post.findUnique({
        where: { id: postId },
        include: { _count: { select: { likes: true } } },
      });
      if (!post) {
        throw new HttpError("Not found", 404);
      }

      let likedByMe = false;
      if (callerWallet) {
        const like = await db.like.findUnique({
          where: {
            postId_walletAddress: { postId, walletAddress: callerWallet },
          },
        });
        likedByMe = like !== null;
      }

      const earnings = await stablePost.postEarnings(BigInt(post.onChainPostId));
      const onChain = {
        onChainPostId: post.onChainPostId,
        postEarningsRaw: earnings.toString(),
      };

      res.json({
        post: serializePost(post, { likeCount: post._count.likes, likedByMe }),
        onChain,
      });
    } catch (e) {
      next(e);
    }
  });

  router.post("/:id/like", requireAuth, async (req, res, next) => {
    try {
      const postId = postIdFromReq(req);
      const wallet = req.auth!.walletAddress;

      const post = await db.post.findUnique({ where: { id: postId } });
      if (!post) throw new HttpError("Not found", 404);

      await db.like.upsert({
        where: { postId_walletAddress: { postId, walletAddress: wallet } },
        create: { postId, walletAddress: wallet },
        update: {},
      });

      const likeCount = await db.like.count({ where: { postId } });
      res.json({ likeCount, likedByMe: true });
    } catch (e) {
      next(e);
    }
  });

  router.delete("/:id/like", requireAuth, async (req, res, next) => {
    try {
      const postId = postIdFromReq(req);
      const wallet = req.auth!.walletAddress;

      await db.like.deleteMany({
        where: { postId, walletAddress: wallet },
      });

      const likeCount = await db.like.count({ where: { postId } });
      res.json({ likeCount, likedByMe: false });
    } catch (e) {
      next(e);
    }
  });

  router.post(
    "/image",
    requireAuth,
    requireOnboarded(db, circleConfigured),
    (req, res, next) => {
      postImageUpload.single("image")(req, res, (err) => {
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
            'Provide an image file in field "image" (JPEG, PNG, WebP, GIF)',
            400
          );
        }
        const imageUrl = await publicUrlForUpload(
          req.file,
          uploadsDir,
          "post",
          req.auth!.userId
        );
        res.json({ imageUrl });
      } catch (e) {
        next(e);
      }
    }
  );

  return router;
}
