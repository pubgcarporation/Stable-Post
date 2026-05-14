import { defineChain } from "viem";

const chainId = Number(import.meta.env.VITE_ARC_CHAIN_ID ?? 5042002);
const rpcHttp =
  import.meta.env.VITE_ARC_RPC_URL ?? "https://rpc.testnet.arc.network";

export const arcTestnet = defineChain({
  id: chainId,
  name: "Arc Testnet",
  // Arc uses USDC as the native gas token (18 decimals). Some UIs label it "ETH"; wrong metadata breaks gas estimation in MetaMask (-32603).
  // See https://docs.arc.network/integrate/connect-to-arc
  nativeCurrency: { decimals: 18, name: "USD Coin", symbol: "USDC" },
  rpcUrls: {
    default: { http: [rpcHttp] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app" },
  },
});
