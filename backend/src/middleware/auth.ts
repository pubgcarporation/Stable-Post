import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt";
import { HttpError } from "../lib/errors";

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const secret = res.locals.jwtSecret as string | undefined;
  if (!secret) {
    next(new HttpError("Server misconfigured", 500));
    return;
  }

  const header = req.headers.authorization;
  const token =
    header?.startsWith("Bearer ") ? header.slice(7).trim() : undefined;
  if (!token) {
    next(new HttpError("Missing Bearer token", 401));
    return;
  }

  try {
    const { sub, wallet } = verifyAccessToken(secret, token);
    req.auth = { userId: sub, walletAddress: wallet };
    next();
  } catch {
    next(new HttpError("Invalid or expired token", 401));
  }
}
