# Stable Post Backend

Express API for Stable Post. It handles wallet authentication, onboarding, posts, likes, profiles, uploads, Arc contract reads, tip metadata, and optional Circle developer-controlled wallet flows.

## Overview

The backend is the bridge between the React app, PostgreSQL, Circle, and Arc Testnet. It keeps social data off-chain while reading on-chain balances and earnings from the `StablePost` contract.

Main responsibilities:

- Wallet login with signed nonce challenges
- JWT session issuing and auth middleware
- User onboarding, username updates, and avatar upload
- Feed, post creation, likes, and liked-post history
- Profile lookup by wallet address or username
- Post image uploads and static upload serving
- Arc contract reads for balances and post earnings
- Optional Circle custodial wallet provisioning, tips, and withdrawals

## Project Structure

```text
backend/
|-- prisma/
|   `-- schema.prisma
|-- scripts/
|   |-- circle-bootstrap.ts
|   `-- circle-create-wallet-set.ts
|-- src/
|   |-- abi/
|   |-- config/
|   |   `-- env.ts
|   |-- lib/
|   |-- middleware/
|   |-- routes/
|   |-- services/
|   |-- app.ts
|   `-- index.ts
|-- package.json
`-- README.md
```

## Setup

Install dependencies:

```bash
npm ci
```

Create `backend/.env`:

```env
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
JWT_SECRET=replace_with_a_long_random_secret
CORS_ORIGIN=http://localhost:5173

ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002
USDC_ADDRESS=0xArcTestnetUsdc
STABLEPOST_ADDRESS=0xYourStablePostContract

CIRCLE_API_KEY=
CIRCLE_ENTITY_SECRET=
CIRCLE_WALLET_SET_ID=
```

`DATABASE_URL` must point to PostgreSQL because `prisma/schema.prisma` uses the PostgreSQL provider.

Circle values are optional. If they are not set, the app still supports normal wallet login and non-custodial web3 flows, but Circle wallet endpoints return a configuration error.

## Commands

Start local development server:

```bash
npm run dev
```

Push the Prisma schema to the database:

```bash
npm run db:push
```

Build TypeScript:

```bash
npm run build
```

Start the compiled server:

```bash
npm start
```

Circle helper scripts:

```bash
npm run circle:create-wallet-set
npm run circle:bootstrap
```

## API Areas

- `GET /health` returns backend health.
- `/auth` handles wallet challenge, signature verification, session checks, onboarding, profile updates, and avatar upload.
- `/posts` handles feed queries, post creation, liked posts, likes, image upload, and per-post on-chain earnings.
- `/users` exposes profile lookup by wallet or username, plus creator contract balance reads.
- `/wallet` handles Circle wallet provisioning, custodial tips, earnings history, and custodial withdrawals when Circle env vars are configured.

## Local Development

Run the backend before the frontend so Vite can proxy `/api` and `/uploads` requests:

```bash
npm run db:push
npm run dev
```

The API listens on `http://127.0.0.1:3000` by default. Set `PORT` if you need another port, and update `frontend/.env` with `VITE_DEV_PROXY_TARGET`.

## Production Notes

Before production deployment:

- Use a managed PostgreSQL database.
- Set a strong `JWT_SECRET`.
- Set `CORS_ORIGIN` to the deployed frontend URL.
- Confirm `STABLEPOST_ADDRESS` and `USDC_ADDRESS` match Arc Testnet.
- Run `npm run build` before starting with `npm start`.
- Keep Circle credentials server-side only.

## Troubleshooting

- **Database connection fails**: Check `DATABASE_URL` and run `npm run db:push`.
- **Auth fails**: Confirm `JWT_SECRET` is set and stable across restarts.
- **Profile route cannot find users**: Check that usernames are saved in the `User` table.
- **Uploads fail**: Confirm the process can write to the configured uploads directory.
- **Circle endpoints fail**: Verify `CIRCLE_API_KEY`, `CIRCLE_ENTITY_SECRET`, and `CIRCLE_WALLET_SET_ID`.
