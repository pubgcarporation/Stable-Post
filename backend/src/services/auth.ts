import { ethers } from "ethers";
import type { PrismaClient, User } from "@prisma/client";
import { HttpError } from "../lib/errors";
import { signAccessToken } from "../lib/jwt";

function buildSignInMessage(walletAddress: string, nonce: string): string {
  return [
    "Stable Post wants you to sign in with your wallet.",
    "",
    `Wallet: ${walletAddress}`,
    `Nonce: ${nonce}`,
  ].join("\n");
}

export async function createLoginChallenge(
  db: PrismaClient,
  walletAddress: string
): Promise<{ nonce: string; message: string }> {
  const addr = ethers.getAddress(walletAddress);
  await db.authNonce.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  const nonce = ethers.hexlify(ethers.randomBytes(32));
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await db.authNonce.create({
    data: { walletAddress: addr, nonce, expiresAt },
  });
  return { nonce, message: buildSignInMessage(addr, nonce) };
}

export async function verifyLoginSignature(
  db: PrismaClient,
  input: { walletAddress: string; signature: string; nonce: string }
): Promise<User> {
  const addr = ethers.getAddress(input.walletAddress);
  const row = await db.authNonce.findUnique({
    where: { nonce: input.nonce },
  });
  if (!row || row.walletAddress !== addr) {
    throw new HttpError("Invalid or unknown nonce", 401);
  }
  if (row.expiresAt < new Date()) {
    await db.authNonce.delete({ where: { nonce: input.nonce } }).catch(() => {});
    throw new HttpError("Nonce expired", 401);
  }

  const message = buildSignInMessage(addr, input.nonce);
  let recovered: string;
  try {
    recovered = ethers.verifyMessage(message, input.signature);
  } catch {
    throw new HttpError("Invalid signature", 401);
  }
  if (ethers.getAddress(recovered) !== addr) {
    throw new HttpError("Signature does not match wallet", 401);
  }

  await db.authNonce.delete({ where: { nonce: input.nonce } });

  const user = await db.user.upsert({
    where: { walletAddress: addr },
    create: { walletAddress: addr },
    update: {},
  });
  return user;
}

export function issueSessionToken(jwtSecret: string, user: User): string {
  return signAccessToken(jwtSecret, {
    sub: user.id,
    wallet: user.walletAddress,
  });
}
