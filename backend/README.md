# Stable Post Backend

Express API for Stable Post. It handles wallet authentication, posts, likes, profile data, image uploads, on-chain read calls, and optional Circle developer-controlled wallets.

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` and fill the values:

```env
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
JWT_SECRET=replace_with_a_long_random_secret
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002
USDC_ADDRESS=0x3600000000000000000000000000000000000000
STABLEPOST_ADDRESS=deployed_contract_address
CIRCLE_API_KEY=
CIRCLE_ENTITY_SECRET=
CIRCLE_WALLET_SET_ID=
```

`DATABASE_URL` must be PostgreSQL because `prisma/schema.prisma` uses the PostgreSQL provider.

## Scripts

```bash
npm run dev
npm run build
npm start
npm run db:push
npm run circle:create-wallet-set
npm run circle:bootstrap
```

## API Areas

- `GET /health` returns `{ ok: true }`.
- `/auth` handles wallet login, session checks, onboarding, profile updates, and avatar upload.
- `/posts` handles feed queries, post creation, likes, image upload, and on-chain post earnings.
- `/users` exposes profile lookup and creator balance reads.
- `/wallet` handles Circle wallet provisioning, custodial tips, and withdrawals when Circle env vars are set.

## Local Development

Run the backend before the frontend so Vite can proxy API calls:

```bash
npm run dev
```

The API listens on `http://localhost:3000` by default.
