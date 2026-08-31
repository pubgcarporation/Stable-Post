import {
  encodeFunctionData,
  encodeFunctionResult,
  decodeFunctionResult,
  erc20Abi,
  custom,
  type Address,
  type Hex,
  type Transport,
} from "viem";
import { stablePostAbi, stablePostAddress } from "./stablePost";

export const ARCSCAN_V2 = "https://testnet.arcscan.app/api/v2";
export const ARC_USDC = "0x3600000000000000000000000000000000000000" as Address;

function toHex(n: string | number | bigint): Hex {
  return `0x${BigInt(n).toString(16)}` as Hex;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${ARCSCAN_V2}${path}`);
  if (res.status === 404) throw Object.assign(new Error("not found"), { status: 404 });
  if (!res.ok) throw new Error(`ArcScan ${res.status}`);
  return res.json() as Promise<T>;
}

type TokenInfo = {
  address_hash?: string;
  address?: string;
  decimals?: string;
  symbol?: string;
};

export async function fetchUsdcMeta(): Promise<{
  address: Address;
  decimals: number;
  symbol: string;
}> {
  const t = await getJson<TokenInfo>(`/tokens/${ARC_USDC}`);
  return {
    address: ARC_USDC,
    decimals: Number(t.decimals ?? 6),
    symbol: t.symbol || "USDC",
  };
}

type TokenBalanceRow = {
  value?: string;
  token?: TokenInfo;
};

export async function fetchUsdcBalance(owner: string): Promise<bigint> {
  try {
    const rows = await getJson<TokenBalanceRow[]>(`/addresses/${owner}/token-balances`);
    const hit = rows.find((r) => {
      const a = (r.token?.address_hash || r.token?.address || "").toLowerCase();
      return a === ARC_USDC.toLowerCase();
    });
    return BigInt(hit?.value ?? "0");
  } catch (e) {
    if ((e as { status?: number }).status === 404) return 0n;
    throw e;
  }
}

async function ethCall(to: string, data: Hex): Promise<Hex> {
  const res = await fetch("https://testnet.arcscan.app/api/eth-rpc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  if (!res.ok) throw new Error(`ArcScan ${res.status}`);
  const body = (await res.json()) as { result?: string };
  if (typeof body.result === "string" && body.result.startsWith("0x")) {
    return body.result as Hex;
  }
  throw new Error("ArcScan eth_call failed");
}

export async function fetchCreatorBalance(creator: string): Promise<bigint> {
  const contract = stablePostAddress();
  if (!contract) throw new Error("Missing contract");
  const raw = await ethCall(
    contract,
    encodeFunctionData({
      abi: stablePostAbi,
      functionName: "creatorBalances",
      args: [creator as Address],
    })
  );
  return decodeFunctionResult({
    abi: stablePostAbi,
    functionName: "creatorBalances",
    data: raw,
  }) as bigint;
}

export async function fetchProtocolStats(): Promise<{
  owner: Address;
  platformFeeBps: bigint;
  platformFeesCollected: bigint;
}> {
  const contract = stablePostAddress();
  if (!contract) throw new Error("Missing contract");
  const [ownerData, feeData, collectedData] = await Promise.all([
    ethCall(contract, encodeFunctionData({ abi: stablePostAbi, functionName: "owner" })),
    ethCall(contract, encodeFunctionData({ abi: stablePostAbi, functionName: "platformFee" })),
    ethCall(contract, encodeFunctionData({ abi: stablePostAbi, functionName: "platformFeesCollected" })),
  ]);
  return {
    owner: decodeFunctionResult({ abi: stablePostAbi, functionName: "owner", data: ownerData }) as Address,
    platformFeeBps: decodeFunctionResult({
      abi: stablePostAbi,
      functionName: "platformFee",
      data: feeData,
    }) as bigint,
    platformFeesCollected: decodeFunctionResult({
      abi: stablePostAbi,
      functionName: "platformFeesCollected",
      data: collectedData,
    }) as bigint,
  };
}

type ScanTx = {
  hash?: string;
  block_number?: number | string;
  block_hash?: string;
  status?: string;
  result?: string;
  success?: boolean;
  position?: number;
  from?: { hash?: string } | string;
  to?: { hash?: string } | string;
  gas_used?: string;
  gas_price?: string;
};

function addrOf(v: ScanTx["from"]): string | undefined {
  if (!v) return undefined;
  return typeof v === "string" ? v : v.hash;
}

function receiptOf(tx: ScanTx, hash: string) {
  if (tx.block_number === undefined || tx.block_number === null) return null;
  const ok = tx.status === "ok" || tx.result === "success" || tx.success === true;
  return {
    transactionHash: (tx.hash || hash) as Hex,
    transactionIndex: toHex(tx.position ?? 0),
    blockHash: (tx.block_hash || toHex(tx.block_number)) as Hex,
    blockNumber: toHex(tx.block_number),
    from: addrOf(tx.from),
    to: addrOf(tx.to) ?? null,
    cumulativeGasUsed: toHex(tx.gas_used ?? 0),
    gasUsed: toHex(tx.gas_used ?? 0),
    contractAddress: null,
    logs: [],
    logsBloom: `0x${"0".repeat(512)}` as Hex,
    status: ok ? "0x1" : "0x0",
    type: "0x2",
    effectiveGasPrice: toHex(tx.gas_price ?? 0),
  };
}

async function fetchReceipt(hash: string) {
  try {
    return receiptOf(await getJson<ScanTx>(`/transactions/${hash}`), hash);
  } catch (e) {
    if ((e as { status?: number }).status === 404) return null;
    throw e;
  }
}

async function handleEthCall(params: unknown): Promise<Hex> {
  const p = Array.isArray(params) ? params[0] : undefined;
  const to = p && typeof p === "object" ? (p as { to?: string }).to : undefined;
  const data = p && typeof p === "object" ? ((p as { data?: Hex }).data as Hex | undefined) : undefined;
  if (!to || !data) throw new Error("eth_call missing to/data");
  const sel = data.slice(0, 10).toLowerCase();
  if (sel === "0x313ce567") {
    const m = await fetchUsdcMeta();
    return encodeFunctionResult({ abi: erc20Abi, functionName: "decimals", result: m.decimals });
  }
  if (sel === "0x95d89b41") {
    const m = await fetchUsdcMeta();
    return encodeFunctionResult({ abi: erc20Abi, functionName: "symbol", result: m.symbol });
  }
  if (sel === "0x70a08231") {
    const owner = `0x${data.slice(34)}`;
    const bal = await fetchUsdcBalance(owner);
    return encodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", result: bal });
  }
  if (sel === "0x3e413bee") {
    return encodeFunctionResult({ abi: stablePostAbi, functionName: "usdc", result: ARC_USDC });
  }
  return ethCall(to, data);
}

export function arcscanTransport(): Transport {
  return custom({
    async request({ method, params }) {
      switch (method) {
        case "eth_chainId":
          return toHex(Number(import.meta.env.VITE_ARC_CHAIN_ID ?? 5042002));
        case "eth_blockNumber": {
          const s = await getJson<{ total_blocks: string }>("/stats");
          return toHex(s.total_blocks);
        }
        case "eth_gasPrice":
        case "eth_maxPriorityFeePerGas":
          return "0x1";
        case "eth_estimateGas":
          return "0x186a0";
        case "eth_getBalance": {
          const account = Array.isArray(params) ? String(params[0]) : "";
          const a = await getJson<{ coin_balance?: string }>(`/addresses/${account}`);
          return toHex(a.coin_balance ?? 0);
        }
        case "eth_call":
          return handleEthCall(params);
        case "eth_getTransactionReceipt":
          return fetchReceipt(Array.isArray(params) ? String(params[0]) : "");
        case "eth_getTransactionByHash": {
          const hash = Array.isArray(params) ? String(params[0]) : "";
          try {
            const tx = await getJson<ScanTx>(`/transactions/${hash}`);
            if (tx.block_number === undefined) return null;
            return {
              hash: tx.hash,
              blockHash: tx.block_hash,
              blockNumber: toHex(tx.block_number),
              from: addrOf(tx.from),
              to: addrOf(tx.to),
              value: "0x0",
              input: "0x",
            };
          } catch (e) {
            if ((e as { status?: number }).status === 404) return null;
            throw e;
          }
        }
        case "eth_getCode":
          return "0x";
        case "eth_getBlockByNumber": {
          const s = await getJson<{ total_blocks: string }>("/stats");
          const n = toHex(s.total_blocks);
          return {
            number: n,
            hash: n,
            parentHash: n,
            timestamp: toHex(Math.floor(Date.now() / 1000)),
            transactions: [],
            miner: "0x0000000000000000000000000000000000000000",
            gasLimit: "0x1",
            gasUsed: "0x0",
            baseFeePerGas: "0x1",
          };
        }
        default:
          throw new Error(`ArcScan: ${method} not supported`);
      }
    },
  });
}
