# Stable Post Frontend

Vite React app for Stable Post. It provides the social feed, wallet login, username profile routes, creator dashboard, wallet page, liked posts, and USDC tipping UI on Arc Testnet.

## Overview

The frontend connects to wallets with RainbowKit and Wagmi, uses Viem for Arc chain configuration, talks to the Express backend through `/api`, and interacts with the deployed `StablePost` contract for tipping and withdrawals.

Main app routes:

- `/` feed
- `/liked` liked posts
- `/dashboard` creator dashboard
- `/wallet` wallet and earnings page
- `/:username` public creator profile
- `/u/:address` legacy wallet-address profile route

## Project Structure

```text
frontend/
|-- src/
|   |-- components/
|   |   |-- auth/
|   |   |-- layout/
|   |   |-- posts/
|   |   |-- profile/
|   |   |-- tips/
|   |   `-- wallet/
|   |-- config/
|   |-- context/
|   |-- hooks/
|   |-- lib/
|   |-- pages/
|   |-- types/
|   |-- App.tsx
|   `-- main.tsx
|-- vite.config.ts
|-- vercel.json
|-- package.json
`-- README.md
```

## Setup

Install dependencies:

```bash
npm ci
```

Create `frontend/.env`:

```env
VITE_API_URL=http://127.0.0.1:3000
VITE_DEV_PROXY_TARGET=http://127.0.0.1:3000
VITE_STABLEPOST_ADDRESS=0xYourStablePostContract
VITE_ARC_RPC_URL=https://rpc.testnet.arc.network
VITE_ARC_CHAIN_ID=5042002
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

In local development, `VITE_API_URL` can be left empty because Vite proxies `/api` and `/uploads` to `VITE_DEV_PROXY_TARGET`.

## Commands

Start development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Development

Start the backend first:

```bash
cd ../backend
npm run db:push
npm run dev
```

Then start the frontend:

```bash
cd ../frontend
npm run dev
```

The frontend runs on `http://localhost:5173` by default. API calls to `/api` and uploads from `/uploads` are proxied to the backend.

## Arc Configuration

Arc Testnet config lives in `src/config/chains.ts`.

Defaults:

- Chain ID: `5042002`
- RPC: `https://rpc.testnet.arc.network`
- Native currency metadata: `USDC`
- Explorer: `https://testnet.arcscan.app`

The app uses USDC as the native gas token metadata so wallets display Arc gas correctly when supported.

## Profile URLs

Creator profile links prefer usernames:

```text
/pubgcarporation
```

The legacy address route still works:

```text
/u/0x85FA92501a6266c17bb68fAE5B772137C5674AdC
```

If the address belongs to a registered user with a username, the page redirects to the username URL.

## Deployment

Build before deployment:

```bash
npm run build
```

Deploy the generated `dist/` folder to Vercel or another static host.

`vercel.json` includes a SPA rewrite so refreshes on routes like `/liked`, `/wallet`, and `/:username` serve the React app instead of returning 404.

For production builds, set:

- `VITE_API_URL` to the deployed backend URL
- `VITE_STABLEPOST_ADDRESS` to the deployed contract address
- `VITE_WALLETCONNECT_PROJECT_ID` to a production WalletConnect project ID

## Troubleshooting

- **Refresh returns 404**: Confirm `vercel.json` is deployed with the frontend.
- **API calls fail**: Check `VITE_API_URL` in production or `VITE_DEV_PROXY_TARGET` in development.
- **Wallet connection fails**: Confirm `VITE_WALLETCONNECT_PROJECT_ID` is set for production.
- **Contract actions fail**: Check `VITE_STABLEPOST_ADDRESS`, Arc network selection, and wallet USDC balance.
- **Images do not load**: Confirm backend upload URLs are reachable from the frontend domain.
