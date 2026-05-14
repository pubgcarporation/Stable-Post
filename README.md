# Stable Post

Stable Post is a social tipping DApp for Arc Testnet. Creators publish posts, readers like and discover content, and supporters send USDC tips through the `StablePost` smart contract.

The app is split into a Solidity contract, an Express/Prisma API, and a Vite React frontend. Arc is the target chain because it gives the product stablecoin-native gas, fast settlement, and familiar EVM tooling.

## DApp Details

- Creator feed with latest, most liked, and most tipped sorting.
- Wallet sign-in with nonce challenge and signed message verification.
- Creator onboarding with username, profile, avatar uploads, and creator pages.
- Likes, liked-post history, dashboard views, wallet page, and earnings chart.
- USDC tipping on Arc Testnet with per-post earnings and creator balances.
- Optional Circle developer-controlled wallets for custodial onboarding, tipping, and withdrawal flows.
- Owner tools for platform fee updates and platform fee withdrawal.

## Stable Post Contract

`contracts/contract/StablePost.sol` accepts USDC tips, prevents self-tips, applies a platform fee, tracks creator balances, stores per-post earnings, and lets creators withdraw. The owner can update the platform fee up to the contract cap and withdraw collected platform fees.

Current Arc Testnet contract used by the app:

```text
0x0E15F0c661cD595c9c4f4256042953204e45e74C
```

## File Structure

```text
Stable Post/
|-- contracts/
|   |-- contract/
|   |   |-- StablePost.sol
|   |   `-- Mocks/MockERC20.sol
|   |-- deploy/StablePost.ts
|   |-- tests/StablePost.test.ts
|   `-- hardhat.config.ts
|-- backend/
|   |-- prisma/schema.prisma
|   |-- scripts/
|   |   |-- circle-bootstrap.ts
|   |   `-- circle-create-wallet-set.ts
|   `-- src/
|       |-- routes/
|       |-- services/
|       |-- middleware/
|       |-- config/env.ts
|       |-- app.ts
|       `-- index.ts
`-- frontend/
    |-- src/
    |   |-- components/
    |   |-- pages/
    |   |-- hooks/
    |   |-- context/
    |   |-- config/
    |   `-- lib/
    |-- vite.config.ts
    `-- index.html
```

## Local Setup

Install dependencies from each package:

```bash
cd contracts
npm ci

cd ../backend
npm ci

cd ../frontend
npm ci
```

Create local `.env` files. Do not commit real `.env` files.

Contracts:

```env
PRIVATE_KEY=
USDC_ADDRESS=
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
ARC_TESTNET_CHAIN_ID=5042002
```

Backend:

```env
DATABASE_URL=
JWT_SECRET=
PORT=3000
CORS_ORIGIN=http://localhost:5173
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002
STABLEPOST_ADDRESS=
USDC_ADDRESS=
CIRCLE_API_KEY=
CIRCLE_ENTITY_SECRET=
CIRCLE_WALLET_SET_ID=
```

Frontend:

```env
VITE_API_URL=
VITE_STABLEPOST_ADDRESS=
VITE_ARC_RPC_URL=https://rpc.testnet.arc.network
VITE_ARC_CHAIN_ID=5042002
VITE_WALLETCONNECT_PROJECT_ID=
VITE_DEV_PROXY_TARGET=http://127.0.0.1:3000
```

## Development

Start the backend:

```bash
cd backend
npm run db:push
npm run dev
```

Start the frontend:

```bash
cd frontend
npm run dev
```

The frontend runs on `http://localhost:5173`. In development, Vite proxies `/api` and `/uploads` to the backend at `http://127.0.0.1:3000`.

Useful contract commands:

```bash
cd contracts
npm run compile
npm test
npm run deploy:arc-testnet
```

## Production Guide

1. Build and test the smart contract.

```bash
cd contracts
npm ci
npm run compile
npm test
```

2. Deploy to Arc Testnet.

```bash
cd contracts
npm run deploy:arc-testnet
```

Copy the deployed address into `backend/.env` as `STABLEPOST_ADDRESS` and into `frontend/.env` as `VITE_STABLEPOST_ADDRESS`.

3. Prepare and run the backend.

```bash
cd backend
npm ci
npm run db:push
npm run build
npm start
```

Set production backend values for `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `ARC_RPC_URL`, `ARC_CHAIN_ID`, `STABLEPOST_ADDRESS`, and `USDC_ADDRESS`. Add the `CIRCLE_*` values only when Circle custodial wallet flows are enabled.

4. Build the frontend.

```bash
cd frontend
npm ci
npm run build
```

Deploy `frontend/dist` to your static host. Set `VITE_API_URL` to the production backend URL before building so API and upload links point to the live server.

5. Smoke test production.

```bash
cd frontend
npm run preview
```

Verify wallet connection, Arc network switching, sign-in, post creation, likes, image uploads, tipping, creator earnings, withdrawals, and owner-only fee tools.

## Arc Details

Stable Post uses Arc Testnet with USDC as the native gas token.

- Network: `Arc Testnet`
- Chain ID: `5042002`
- RPC: `https://rpc.testnet.arc.network`
- Explorer: `https://testnet.arcscan.app`
- Faucet: `https://faucet.circle.com`
- Native currency metadata: `USDC`

Official Arc links:

- Site: [arc.network](https://www.arc.network/)
- Docs: [docs.arc.network](https://docs.arc.network/)
- Connect wallet guide: [Connect to Arc](https://docs.arc.network/integrate/connect-to-arc)
- RPC endpoints: [Arc RPC endpoints](https://docs.arc.network/arc/references/rpc-endpoints)
- Community: [arc.network/community](https://arc.network/community)
- Discord: [discord.com/invite/buildonarc](https://discord.com/invite/buildonarc)
- Status: [status.arc.network](https://status.arc.network/)
