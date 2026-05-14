# Stable Post

Stable Post is an Arc testnet social tipping app where creators publish posts and receive USDC tips. The project combines a Solidity tipping contract, an Express API, and a Vite React frontend built around Arc's USDC-native testnet experience.

## Why Arc

Arc is the target network for Stable Post because it makes stablecoin payments feel native to the app. The frontend connects wallets to Arc testnet, the backend reads contract state from Arc RPC, and the smart contract accepts USDC tips for creators.

Current Arc testnet defaults:

- RPC: `https://rpc.testnet.arc.network`
- Chain ID: `5042002`
- Native currency metadata: USDC
- Explorer: `https://testnet.arcscan.app`

## Project Structure

- `contracts/` contains the Hardhat project and `StablePost.sol`.
- `backend/` contains the Express API, Prisma schema, auth, posts, uploads, Circle wallet flows, and Arc contract reads.
- `frontend/` contains the React app, RainbowKit/Wagmi wallet connection, Arc chain config, post feed, dashboard, wallet page, and creator profiles.

## Smart Contract

`StablePost.sol` accepts USDC tips, applies a platform fee, tracks creator balances, stores per-post earnings, and lets creators withdraw. It also exposes owner controls for platform fee updates and fee withdrawal.

The latest deployed Arc testnet contract used by local env files is:

```text
0x0E15F0c661cD595c9c4f4256042953204e45e74C
```

## Local Setup

Install dependencies in each workspace:

```bash
cd contracts && npm install
cd ../backend && npm install
cd ../frontend && npm install
```

Configure environment files:

- `contracts/.env` for deployer key, Arc RPC, chain ID, and USDC address.
- `backend/.env` for PostgreSQL, JWT secret, Arc RPC, contract address, USDC address, and optional Circle keys.
- `frontend/.env` for `VITE_STABLEPOST_ADDRESS`, Arc RPC, chain ID, and optional WalletConnect project ID.

Do not commit real `.env` files.

## Development

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend:

```bash
cd frontend
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API/upload requests to the backend on `http://127.0.0.1:3000`.

## Useful Commands

Contracts:

```bash
npm run compile
npm test
npm run deploy:arc-testnet
```

Backend:

```bash
npm run db:push
npm run dev
npm run build
```

Frontend:

```bash
npm run dev
npm run build
```

## Deployment Flow

1. Deploy `StablePost.sol` to Arc testnet from `contracts/`.
2. Copy the deployed address into `backend/.env` as `STABLEPOST_ADDRESS`.
3. Copy the same address into `frontend/.env` as `VITE_STABLEPOST_ADDRESS`.
4. Run backend and frontend builds before shipping.
