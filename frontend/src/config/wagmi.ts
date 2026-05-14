import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arcTestnet } from "./chains";

const WALLETCONNECT_FALLBACK_PROJECT_ID =
  "3a6a8fa111f53dafc59e15f6ea7f22e4";

function walletConnectProjectId(): string {
  const raw = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim();
  if (
    !raw ||
    raw === "00000000000000000000000000000000" ||
    /^0+$/.test(raw)
  ) {
    return WALLETCONNECT_FALLBACK_PROJECT_ID;
  }
  return raw;
}

export const wagmiConfig = getDefaultConfig({
  appName: "Stable Post",
  projectId: walletConnectProjectId(),
  chains: [arcTestnet],
  ssr: false,
});
