import { ethers } from "ethers";

export type CircleCredentials = {
  apiKey: string;
  entitySecret: string;
  walletSetId: string;
};

export type AppEnv = {
  port: number;
  rpcUrl: string;
  chainId: number;
  stablePostAddress: string;
  usdcAddress: string | undefined;
  jwtSecret: string;
  circle: CircleCredentials | undefined;
};

function required(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value.trim();
}

function loadCircleCredentials(): CircleCredentials | undefined {
  const apiKey = process.env.CIRCLE_API_KEY?.trim();
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET?.trim();
  const walletSetId = process.env.CIRCLE_WALLET_SET_ID?.trim();
  const anySet = !!(apiKey || entitySecret || walletSetId);
  if (!anySet) return undefined;
  return {
    apiKey: required("CIRCLE_API_KEY", apiKey),
    entitySecret: required("CIRCLE_ENTITY_SECRET", entitySecret),
    walletSetId: required("CIRCLE_WALLET_SET_ID", walletSetId),
  };
}

function parsePort(raw: string | undefined): number {
  const n = Number(raw ?? "3000");
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return n;
}

function parseChainId(raw: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error("ARC_CHAIN_ID must be a positive integer");
  }
  return n;
}

export function loadEnv(): AppEnv {
  required("DATABASE_URL", process.env.DATABASE_URL);

  const rpcUrl =
    process.env.ARC_RPC_URL?.trim() ||
    process.env.ARC_TESTNET_RPC_URL?.trim();
  const chainIdRaw =
    process.env.ARC_CHAIN_ID?.trim() ||
    process.env.ARC_TESTNET_CHAIN_ID?.trim();

  const stablePostRaw = required(
    "STABLEPOST_ADDRESS",
    process.env.STABLEPOST_ADDRESS
  );
  if (!ethers.isAddress(stablePostRaw)) {
    throw new Error("STABLEPOST_ADDRESS must be a valid Ethereum address");
  }

  return {
    port: parsePort(process.env.PORT),
    rpcUrl: required("ARC_RPC_URL or ARC_TESTNET_RPC_URL", rpcUrl),
    chainId: parseChainId(required("ARC_CHAIN_ID or ARC_TESTNET_CHAIN_ID", chainIdRaw)),
    stablePostAddress: ethers.getAddress(stablePostRaw),
    usdcAddress: process.env.USDC_ADDRESS?.trim() || undefined,
    jwtSecret: required("JWT_SECRET", process.env.JWT_SECRET),
    circle: loadCircleCredentials(),
  };
}
