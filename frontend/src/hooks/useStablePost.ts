import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import type { Address } from "viem";
import { stablePostAddress } from "../lib/stablePost";
import {
  ARC_USDC,
  fetchCreatorBalance,
  fetchProtocolStats,
  fetchUsdcBalance,
  fetchUsdcMeta,
} from "../lib/arcscan";

export function useStablePostContract(): Address | undefined {
  return stablePostAddress();
}

export function useUsdcMeta() {
  const contract = useStablePostContract();
  const { data } = useQuery({
    queryKey: ["arcscan", "usdc-meta"],
    queryFn: fetchUsdcMeta,
    staleTime: 120_000,
  });
  return {
    contract,
    usdcAddress: data?.address ?? ARC_USDC,
    decimals: data?.decimals,
    symbol: data?.symbol ?? "USDC",
  };
}

export function useUsdcBalance(owner: Address | undefined) {
  return useQuery({
    queryKey: ["arcscan", "usdc-balance", owner],
    queryFn: () => fetchUsdcBalance(owner!),
    enabled: !!owner,
  });
}

export function useCustodialUsdcBalance(custodialAddress: string | null | undefined) {
  return useQuery({
    queryKey: ["arcscan", "usdc-balance", custodialAddress],
    queryFn: () => fetchUsdcBalance(custodialAddress!),
    enabled: !!custodialAddress,
    refetchInterval: 10_000,
  });
}

export function useCreatorBalance(creator: Address | undefined) {
  const contract = useStablePostContract();
  return useQuery({
    queryKey: ["arcscan", "creator-balance", creator],
    queryFn: () => fetchCreatorBalance(creator!),
    enabled: !!contract && !!creator,
  });
}

export function useProtocolStats() {
  const contract = useStablePostContract();
  const { data, refetch } = useQuery({
    queryKey: ["arcscan", "protocol"],
    queryFn: fetchProtocolStats,
    enabled: !!contract,
    refetchInterval: 30_000,
  });
  return {
    refetch,
    platformFeeBps: data?.platformFeeBps,
    platformFeesCollected: data?.platformFeesCollected,
  };
}

export function useIsOwner() {
  const { address } = useAccount();
  const contract = useStablePostContract();
  const { data } = useQuery({
    queryKey: ["arcscan", "protocol"],
    queryFn: fetchProtocolStats,
    enabled: !!contract,
    staleTime: 30_000,
  });
  if (!address || !data?.owner) return false;
  return address.toLowerCase() === data.owner.toLowerCase();
}
