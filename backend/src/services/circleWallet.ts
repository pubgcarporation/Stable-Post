import { createHash } from "node:crypto";
import axios from "axios";
import { ethers } from "ethers";
import {
  Blockchain,
  HttpRequestError as CircleHttpRequestError,
  HttpResponseError as CircleHttpResponseError,
  initiateDeveloperControlledWalletsClient,
} from "@circle-fin/developer-controlled-wallets";
import type { CircleCredentials } from "../config/env";
import { HttpError } from "../lib/errors";

const USDC_ALLOWANCE_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

const POLL_INTERVAL_MS = 3_000;
const POLL_MAX = 15;

async function pollCircleTx(
  client: ReturnType<typeof initiateDeveloperControlledWalletsClient>,
  txId: string,
  label: string
): Promise<void> {
  for (let i = 0; i < POLL_MAX; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const res = await client.getTransaction({ id: txId });
    const state = (res.data as { transaction?: { state?: string } } | undefined)
      ?.transaction?.state;
    if (state === "CONFIRMED" || state === "COMPLETE") return;
    if (state === "FAILED" || state === "DENIED" || state === "STUCK") {
      throw new HttpError(`${label} failed on-chain (${state})`, 500);
    }
  }
  throw new HttpError(`${label} timed out waiting for confirmation`, 504);
}

export async function executeCustodialTip(
  circle: CircleCredentials,
  params: {
    walletId: string;
    walletAddress: string;
    creatorAddress: string;
    postId: number;
    amountWei: bigint;
    usdcAddress: string;
    stablePostAddress: string;
    provider: ethers.JsonRpcProvider;
  }
): Promise<{ transactionId: string; state: string }> {
  const {
    walletId,
    walletAddress,
    creatorAddress,
    postId,
    amountWei,
    usdcAddress,
    stablePostAddress,
    provider,
  } = params;

  const client = initiateDeveloperControlledWalletsClient({
    apiKey: circle.apiKey,
    entitySecret: circle.entitySecret,
  });

  const fee = {
    type: "level" as const,
    config: { feeLevel: "MEDIUM" as const },
  };

  const usdcContract = new ethers.Contract(
    usdcAddress,
    USDC_ALLOWANCE_ABI,
    provider
  );
  const allowance = (await usdcContract.allowance(
    walletAddress,
    stablePostAddress
  )) as bigint;

  if (allowance < amountWei) {
    const maxUint256 =
      "115792089237316195423570985008687907853269984665640564039457584007913129639935";
    const approvalRes = await client.createContractExecutionTransaction({
      walletId,
      contractAddress: usdcAddress,
      abiFunctionSignature: "approve(address,uint256)",
      abiParameters: [stablePostAddress, maxUint256],
      fee,
    });
    const approvalTxId = (approvalRes.data as { id?: string } | undefined)?.id;
    if (!approvalTxId) {
      throw new HttpError("Circle did not return an approval transaction", 503);
    }
    await pollCircleTx(client, approvalTxId, "USDC approval");
  }

  const tipRes = await client.createContractExecutionTransaction({
    walletId,
    contractAddress: stablePostAddress,
    abiFunctionSignature: "tipCreator(address,uint256,uint256)",
    abiParameters: [creatorAddress, postId.toString(), amountWei.toString()],
    fee,
  });

  const tipData = tipRes.data as { id?: string; state?: string } | undefined;
  const tipTxId = tipData?.id;
  if (!tipTxId) {
    throw new HttpError("Circle did not return a tip transaction", 503);
  }
  const state = tipData?.state ?? "INITIATED";
  return { transactionId: tipTxId, state };
}

export async function executeWithdrawFromCustodialWallet(
  circle: CircleCredentials,
  params: {
    walletAddress: string;
    toAddress: string;
    amount: string;
    usdcAddress: string;
  }
): Promise<{ transactionId: string; state: string }> {
  const { walletAddress, toAddress, amount, usdcAddress } = params;

  const client = initiateDeveloperControlledWalletsClient({
    apiKey: circle.apiKey,
    entitySecret: circle.entitySecret,
  });

  const fee = {
    type: "level" as const,
    config: { feeLevel: "MEDIUM" as const },
  };

  const idempotencyKey = idempotencyKeyFromSeed(
    `stable-post/withdraw:${walletAddress}:${toAddress}:${amount}:${Date.now()}`
  );

  try {
    const res = await client.createTransaction({
      walletAddress,
      blockchain: Blockchain.ArcTestnet,
      tokenAddress: usdcAddress,
      destinationAddress: ethers.getAddress(toAddress),
      amount: [amount.trim()],
      fee,
      idempotencyKey,
    });

    const data = res.data as { id?: string; state?: string } | undefined;
    const txId = data?.id;
    if (!txId) {
      throw new HttpError("Circle did not return a withdraw transaction", 503);
    }
    return { transactionId: txId, state: data?.state ?? "INITIATED" };
  } catch (e: unknown) {
    if (e instanceof HttpError) throw e;

    if (e instanceof CircleHttpRequestError) {
      throw new HttpError(e.message || "Cannot reach Circle API", 503);
    }

    if (e instanceof CircleHttpResponseError) {
      const body = e.error?.response?.data;
      const msg =
        circleBodyMessage(body) || e.message.trim() || "Circle error";
      throw new HttpError(msg, statusOr503(e.status));
    }

    if (axios.isAxiosError(e)) {
      if (!e.response) {
        throw new HttpError(
          `Cannot reach Circle API (${e.code ?? "network"}).`,
          503
        );
      }
      const msg =
        circleBodyMessage(e.response.data) || e.message || "Circle error";
      throw new HttpError(msg, statusOr503(e.response.status));
    }

    throw new HttpError(
      e instanceof Error ? e.message : "Withdraw failed",
      503
    );
  }
}

function idempotencyKeyFromSeed(seed: string): string {
  const h = createHash("sha256").update(seed).digest();
  const b = Buffer.alloc(16);
  h.copy(b, 0, 0, 16);
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const hex = b.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function circleBodyMessage(data: unknown): string | undefined {
  if (data == null || typeof data !== "object") return undefined;
  const o = data as Record<string, unknown>;
  if (typeof o.message === "string") {
    return typeof o.code === "number"
      ? `[${o.code}] ${o.message}`
      : o.message;
  }
  return undefined;
}

function statusOr503(code: number | undefined): number {
  return code != null && code >= 400 && code < 600 ? code : 503;
}

export async function provisionCustodialWalletOnArc(
  circle: CircleCredentials,
  userId: string
): Promise<{ walletId: string; address: string }> {
  const client = initiateDeveloperControlledWalletsClient({
    apiKey: circle.apiKey,
    entitySecret: circle.entitySecret,
  });

  try {
    const response = await client.createWallets({
      walletSetId: circle.walletSetId,
      blockchains: [Blockchain.ArcTestnet],
      count: 1,
      idempotencyKey: idempotencyKeyFromSeed(
        `stable-post/circle-provision:${userId}`
      ),
    });

    const first = response.data?.wallets?.[0];
    if (!first?.id || !first?.address) {
      throw new HttpError(
        "Circle returned no wallet for this wallet set / chain.",
        503
      );
    }
    return { walletId: first.id, address: first.address };
  } catch (e: unknown) {
    if (e instanceof HttpError) throw e;

    if (e instanceof CircleHttpRequestError) {
      throw new HttpError(e.message || "Cannot reach Circle API", 503);
    }

    if (e instanceof CircleHttpResponseError) {
      const body = e.error?.response?.data;
      const msg =
        circleBodyMessage(body) || e.message.trim() || "Circle error";
      throw new HttpError(msg, statusOr503(e.status));
    }

    if (axios.isAxiosError(e)) {
      if (!e.response) {
        throw new HttpError(
          `Cannot reach Circle API (${e.code ?? "network"}).`,
          503
        );
      }
      const msg =
        circleBodyMessage(e.response.data) ||
        e.message ||
        "Circle error";
      throw new HttpError(msg, statusOr503(e.response.status));
    }

    throw new HttpError(
      e instanceof Error ? e.message : "Circle wallet provisioning failed",
      503
    );
  }
}
