import { useCallback } from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { arcTestnet } from "../config/chains";

export function useArcChain() {
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();

  const isArc = chainId === arcTestnet.id;

  const ensureArc = useCallback(async () => {
    if (chainId === arcTestnet.id) return;
    await switchChainAsync({ chainId: arcTestnet.id });
  }, [chainId, switchChainAsync]);

  return {
    isArc,
    ensureArc,
    isSwitching,
    chain: arcTestnet,
  };
}
