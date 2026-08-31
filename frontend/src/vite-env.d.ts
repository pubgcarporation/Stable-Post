/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEV_PROXY_TARGET?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_STABLEPOST_ADDRESS?: string;
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
  readonly VITE_ARC_CHAIN_ID?: string;
}
