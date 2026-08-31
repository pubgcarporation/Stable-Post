import { defineChain } from "viem";
import { ARCSCAN_V2 } from "../lib/arcscan";

const chainId = Number(import.meta.env.VITE_ARC_CHAIN_ID ?? 5042002);

export const arcTestnet = defineChain({
  id: chainId,
  name: "Arc Testnet",
  nativeCurrency: { decimals: 18, name: "USD Coin", symbol: "USDC" },
  rpcUrls: {
    default: { http: [ARCSCAN_V2] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app" },
  },
});
