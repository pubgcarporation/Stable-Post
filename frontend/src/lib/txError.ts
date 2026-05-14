import { BaseError } from "viem";

export function walletTxnErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "string") {
    const s = err.trim();
    return s || fallback;
  }
  if (err instanceof BaseError) {
    const main = (err.shortMessage || err.message).trim();
    if (main) return main;
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }
  return fallback;
}
