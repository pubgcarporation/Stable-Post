import { formatUnits } from "viem";
import { arcTestnet } from "../config/chains";

export function shortenAddress(address: string, head = 6, tail = 4): string {
  const a = address.trim();
  if (!a.startsWith("0x") || a.length < 12) return a;
  return `${a.slice(0, head)}…${a.slice(-tail)}`;
}

export function formatUsdc(
  raw: bigint | string | undefined,
  decimals = 6,
  opts: { withSymbol?: boolean; maxFractionDigits?: number } = {}
): string {
  if (raw === undefined || raw === null) return opts.withSymbol ? "— USDC" : "—";
  try {
    const big = typeof raw === "bigint" ? raw : BigInt(raw);
    const s = formatUnits(big, decimals);
    const n = Number(s);
    const formatted = Number.isFinite(n)
      ? n.toLocaleString(undefined, {
          maximumFractionDigits: opts.maxFractionDigits ?? 4,
        })
      : s;
    return opts.withSymbol ? `${formatted} USDC` : formatted;
  } catch {
    return String(raw);
  }
}

export function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  const diff = Date.now() - t;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function arcTxExplorerUrl(hash: string): string {
  const base = arcTestnet.blockExplorers?.default.url ?? "";
  return `${base.replace(/\/$/, "")}/tx/${hash}`;
}
