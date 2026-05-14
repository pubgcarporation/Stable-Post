import { erc20Abi, type Address } from "viem";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { stablePostAbi, stablePostAddress } from "../lib/stablePost";

const TWO_MIN = 120_000;

export function useStablePostContract(): Address | undefined {
  return stablePostAddress();
}

export function useUsdcMeta() {
  const contract = useStablePostContract();

  const { data: usdcAddress } = useReadContract({
    address: contract,
    abi: stablePostAbi,
    functionName: "usdc",
    query: { enabled: !!contract, staleTime: TWO_MIN },
  });

  const { data: decimals } = useReadContract({
    address: usdcAddress as Address | undefined,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: !!usdcAddress, staleTime: TWO_MIN },
  });

  const { data: symbol } = useReadContract({
    address: usdcAddress as Address | undefined,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: !!usdcAddress, staleTime: TWO_MIN },
  });

  return {
    contract,
    usdcAddress: usdcAddress as Address | undefined,
    decimals: typeof decimals === "number" ? decimals : undefined,
    symbol: typeof symbol === "string" ? symbol : "USDC",
  };
}

export function useUsdcBalance(owner: Address | undefined) {
  const { usdcAddress } = useUsdcMeta();
  return useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: owner ? [owner] : undefined,
    query: { enabled: !!usdcAddress && !!owner },
  });
}

export function useCustodialUsdcBalance(custodialAddress: string | null | undefined) {
  const { usdcAddress } = useUsdcMeta();
  const addr = custodialAddress as Address | undefined;
  return useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: addr ? [addr] : undefined,
    query: { enabled: !!usdcAddress && !!addr, refetchInterval: 10_000 },
  });
}

export function useCreatorBalance(creator: Address | undefined) {
  const contract = useStablePostContract();
  return useReadContract({
    address: contract,
    abi: stablePostAbi,
    functionName: "creatorBalances",
    args: creator ? [creator] : undefined,
    query: { enabled: !!contract && !!creator },
  });
}

export function useProtocolStats() {
  const contract = useStablePostContract();
  const enabled = !!contract;
  const { data, refetch } = useReadContracts({
    contracts: enabled
      ? [
          { address: contract, abi: stablePostAbi, functionName: "platformFee" },
          {
            address: contract,
            abi: stablePostAbi,
            functionName: "platformFeesCollected",
          },
        ]
      : [],
    query: { enabled, refetchInterval: 30_000 },
  });

  return {
    refetch,
    platformFeeBps: data?.[0]?.result as bigint | undefined,
    platformFeesCollected: data?.[1]?.result as bigint | undefined,
  };
}

export function useIsOwner() {
  const { address } = useAccount();
  const contract = useStablePostContract();
  const { data: owner } = useReadContract({
    address: contract,
    abi: stablePostAbi,
    functionName: "owner",
    query: { enabled: !!contract, refetchInterval: 30_000 },
  });
  if (!address || !owner) return false;
  return address.toLowerCase() === (owner as string).toLowerCase();
}
