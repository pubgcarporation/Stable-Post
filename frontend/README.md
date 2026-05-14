# Stable Post Frontend

Vite React app for Stable Post. It connects wallets with RainbowKit/Wagmi, reads Arc testnet config, and talks to the backend through the Vite dev proxy.

## Setup

```bash
npm install
```

Optional `frontend/.env` values:

```env
VITE_DEV_PROXY_TARGET=http://127.0.0.1:3000
VITE_STABLEPOST_ADDRESS=deployed_contract_address
VITE_ARC_RPC_URL=https://rpc.testnet.arc.network
VITE_ARC_CHAIN_ID=5042002
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

If `VITE_DEV_PROXY_TARGET` is not set, the dev server proxies API calls to `http://127.0.0.1:3000`.

## Scripts

```bash
npm run dev
npm run build
npm run preview
```

## Development

Start the backend first, then run:

```bash
npm run dev
```

The frontend runs on `http://localhost:5173` by default. API calls to `/api` and uploads from `/uploads` are proxied to the backend.

## Build Notes

The build config keeps known wallet dependency warnings out of the output and allows the current wallet/web3 bundle size. Run this before deployment:

```bash
npm run build
```
