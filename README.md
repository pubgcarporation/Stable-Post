# Stable Post 💸

A social tipping DApp built on **Arc Testnet** where creators publish posts, build public profiles, and receive USDC tips from supporters. Stable Post combines an EVM smart contract, an Express API, and a React frontend to make creator payments feel fast, simple, and stablecoin-native.

Live app: [stable-post.vercel.app](https://stable-post.vercel.app/)

## 🌟 Features

### For Creators

- **Creator Profiles**: Public profile pages with username URLs like `/pubgcarporation`
- **Post Publishing**: Create text posts with optional images
- **USDC Tips**: Receive tips through the `StablePost` smart contract
- **Creator Dashboard**: Track posts, wallet state, and tipping activity
- **Earnings View**: See creator balances, earnings history, and withdrawal controls
- **Avatar Uploads**: Add profile images through the backend upload flow

### For Supporters

- **Social Feed**: Browse latest, most liked, and most tipped posts
- **Like System**: Like posts and view your liked-post history
- **Wallet Login**: Sign in with a wallet using nonce challenge verification
- **Creator Discovery**: Open profiles by username instead of long wallet addresses
- **Stablecoin Tipping**: Tip creators with USDC on Arc Testnet

### Web3 & Payments

- **Arc Testnet Native**: Built for Arc's USDC gas and stablecoin payment experience
- **Smart Contract Tips**: Tips are tracked on-chain with per-post earnings
- **Platform Fee Support**: Contract owner can configure platform fees within the contract cap
- **Creator Withdrawals**: Creators can withdraw their accumulated USDC balance
- **Optional Circle Wallets**: Backend supports Circle developer-controlled wallets for custodial flows

## 🏗️ Architecture

```text
Stable Post/
|-- contracts/          # Hardhat smart contract workspace
|   |-- contract/       # Solidity contracts
|   |-- deploy/         # Arc Testnet deployment scripts
|   `-- tests/          # Contract tests
|
|-- backend/            # Express API and database layer
|   |-- prisma/         # PostgreSQL schema
|   |-- scripts/        # Circle wallet setup scripts
|   `-- src/            # Routes, services, middleware, config
|
`-- frontend/           # Vite React application
    |-- src/
    |   |-- components/ # UI, feed, wallet, profile, tipping
    |   |-- pages/      # Feed, liked posts, dashboard, wallet, profiles
    |   |-- hooks/      # Arc and contract hooks
    |   |-- context/    # Auth and toast providers
    |   `-- lib/        # API, formatting, media, contract helpers
    `-- vercel.json     # SPA fallback routing for Vercel
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm
- PostgreSQL database
- Arc Testnet wallet with USDC for gas and tipping
- WalletConnect project ID for production wallet connection
- Optional Circle developer account for custodial wallet flows

### 1. Install Dependencies

```bash
cd contracts
npm ci

cd ../backend
npm ci

cd ../frontend
npm ci
```

### 2. Configure Environment Files

Create `.env` files in `contracts/`, `backend/`, and `frontend/`.

Never commit real `.env` files.

### 3. Start Backend

```bash
cd backend
npm run db:push
npm run dev
```

The backend runs on `http://127.0.0.1:3000` by default.

### 4. Start Frontend

```bash
cd frontend
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies `/api` plus `/uploads` to the backend during development.

## 📋 Complete Setup Sequence

```bash
# 1. Smart contracts
cd contracts
npm ci
npm run compile
npm test
npm run deploy:arc-testnet

# 2. Copy deployed StablePost address

# 3. Backend
cd ../backend
npm ci
npm run db:push
npm run dev

# 4. Frontend
cd ../frontend
npm ci
npm run dev
```

## 🛠️ Technology Stack

### Smart Contracts

- **Solidity 0.8.20**: Smart contract language
- **Hardhat 3**: Contract development and deployment
- **OpenZeppelin**: Ownable, SafeERC20, and ReentrancyGuard utilities
- **Ethers.js**: Deployment and contract interaction tooling

### Backend

- **Node.js + Express**: API server
- **TypeScript**: Type-safe backend development
- **Prisma**: PostgreSQL ORM
- **PostgreSQL**: Users, posts, likes, tips, and auth nonces
- **JWT**: Wallet-authenticated sessions
- **Multer**: Avatar and post image uploads
- **Circle SDK**: Optional developer-controlled wallet flows

### Frontend

- **React 18**: UI framework
- **Vite**: Build tool and dev server
- **TypeScript**: Type-safe frontend development
- **React Router**: Feed, dashboard, wallet, liked posts, and profile routes
- **Wagmi + Viem**: EVM wallet and contract interaction
- **RainbowKit**: Wallet connection UI
- **TanStack Query**: Async state foundation for wallet/web3 flows

## 💸 How It Works

### Tipping Flow

1. A creator signs in with a wallet and completes onboarding.
2. The creator publishes a post through the backend API.
3. A supporter opens the feed and connects a wallet on Arc Testnet.
4. The supporter tips a creator with USDC.
5. `StablePost.sol` pulls the USDC, applies the platform fee, and records creator plus per-post earnings.
6. The backend stores tip metadata for feed sorting, history, and charts.
7. The creator withdraws their available contract balance.

### Profile Flow

1. Users choose a username during onboarding.
2. Feed author links use clean username URLs such as `/pubgcarporation`.
3. Old wallet profile URLs like `/u/0x...` remain supported.
4. If a wallet URL belongs to a registered user, the frontend redirects to the username profile.

### Contract Flow

`contracts/contract/StablePost.sol` handles:

- USDC tip collection
- Self-tip prevention
- Platform fee accounting
- Creator balance accounting
- Per-post earning totals
- Creator withdrawals
- Owner-only platform fee updates
- Owner-only platform fee withdrawals

Current Arc Testnet contract:

```text
0x0E15F0c661cD595c9c4f4256042953204e45e74C
```
 

## 🧪 Testing

### Smart Contract Tests

```bash
cd contracts
npm test
```

### Smart Contract Compile

```bash
cd contracts
npm run compile
```

### Backend Build

```bash
cd backend
npm run build
```

### Frontend Build

```bash
cd frontend
npm run build
```

## 🌐 Network Configuration

Stable Post is configured for Arc Testnet.

| Field | Value |
| --- | --- |
| Network | Arc Testnet |
| Chain ID | `5042002` |
| RPC URL | `https://rpc.testnet.arc.network` |
| Currency | `USDC` |
| Explorer | `https://testnet.arcscan.app` |
| Faucet | `https://faucet.circle.com` |

Arc uses USDC as the native gas token, so users need Arc Testnet USDC for gas and tips.

## 📝 Environment Variables

### Contracts (`contracts/.env`)

```env
PRIVATE_KEY=your_deployer_private_key
USDC_ADDRESS=arc_testnet_usdc_address
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
ARC_TESTNET_CHAIN_ID=5042002
```

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://user:password@host:5432/stable_post
JWT_SECRET=your_long_random_secret
PORT=3000
CORS_ORIGIN=http://localhost:5173

ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002
STABLEPOST_ADDRESS=0xYourStablePostContract
USDC_ADDRESS=0xArcTestnetUsdc

CIRCLE_API_KEY=
CIRCLE_ENTITY_SECRET=
CIRCLE_WALLET_SET_ID=
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://127.0.0.1:3000
VITE_STABLEPOST_ADDRESS=0xYourStablePostContract
VITE_ARC_RPC_URL=https://rpc.testnet.arc.network
VITE_ARC_CHAIN_ID=5042002
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
VITE_DEV_PROXY_TARGET=http://127.0.0.1:3000
```

⚠️ Never commit private keys, JWT secrets, database URLs, Circle credentials, or production `.env` files.

## 🚢 Production Guide

### 1. Deploy Smart Contract

```bash
cd contracts
npm ci
npm run compile
npm test
npm run deploy:arc-testnet
```

Copy the deployed address into:

- `backend/.env` as `STABLEPOST_ADDRESS`
- `frontend/.env` as `VITE_STABLEPOST_ADDRESS`

### 2. Prepare Backend

```bash
cd backend
npm ci
npm run db:push
npm run build
npm start
```

Set production values for:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `ARC_RPC_URL`
- `ARC_CHAIN_ID`
- `STABLEPOST_ADDRESS`
- `USDC_ADDRESS`
- `CIRCLE_*` only when custodial wallet flows are enabled

### 3. Deploy Frontend

```bash
cd frontend
npm ci
npm run build
```

Deploy `frontend/dist` to Vercel or another static host. `frontend/vercel.json` rewrites all routes to `/`, so direct refresh on routes like `/liked`, `/wallet`, and `/pubgcarporation` works correctly.

### 4. Production Smoke Test

Verify:

- Wallet connect
- Arc network switching
- Sign-in and onboarding
- Username profile route
- Post creation
- Likes and liked posts
- Image uploads
- USDC tips
- Creator earnings
- Withdrawals
- Owner-only platform fee tools

## 🔒 Security Considerations

- **Private Keys**: Never commit deployer keys or wallet secrets
- **JWT Secret**: Use a long random secret in production
- **CORS**: Set `CORS_ORIGIN` to the production frontend URL
- **Database**: Use a managed PostgreSQL database with backups
- **Uploads**: Serve uploaded media from a trusted backend or storage service
- **Contract Owner**: Keep the owner wallet secure because it controls fee settings
- **Testnet Status**: This app targets Arc Testnet, not mainnet production funds
- **Circle Credentials**: Keep Circle API keys and entity secrets server-side only

## 🐛 Troubleshooting

### Frontend Issues

- **Route refresh gives 404**: Make sure `frontend/vercel.json` is deployed with the SPA rewrite
- **Wallet does not switch to Arc**: Add Arc Testnet manually using the network details above
- **Profile shows wallet address**: The creator may not have a username yet
- **API calls fail in production**: Check `VITE_API_URL` and backend CORS settings

### Backend Issues

- **Database errors**: Verify `DATABASE_URL`, then run `npm run db:push`
- **Auth fails**: Check `JWT_SECRET` and wallet signature flow
- **Uploads fail**: Confirm the backend has write access to the uploads directory
- **Circle wallet errors**: Verify `CIRCLE_API_KEY`, `CIRCLE_ENTITY_SECRET`, and `CIRCLE_WALLET_SET_ID`

### Contract Issues

- **Deploy fails**: Check `PRIVATE_KEY`, Arc RPC URL, deployer balance, and `USDC_ADDRESS`
- **Tips fail**: Confirm wallet is on Arc Testnet and has enough USDC
- **Withdraw fails**: Confirm creator has a positive contract balance

## 📚 Documentation

- [Arc Website](https://www.arc.network/) - Stablecoin-native L1 overview
- [Arc Docs](https://docs.arc.network/) - Build and integrate on Arc
- [Connect to Arc](https://docs.arc.network/integrate/connect-to-arc) - Wallet setup and network details
- [Arc RPC Endpoints](https://docs.arc.network/arc/references/rpc-endpoints) - RPC and websocket endpoints
- [Arc Community](https://arc.network/community) - Builder community
- [Arc Discord](https://discord.com/invite/buildonarc) - Discord support and updates
- [Arc Status](https://status.arc.network/) - Network status
- [Hardhat Docs](https://hardhat.org/docs) - Smart contract development
- [Vite Docs](https://vite.dev/) - Frontend build tooling
- [Wagmi Docs](https://wagmi.sh/) - React hooks for Ethereum
- [RainbowKit Docs](https://www.rainbowkit.com/docs/introduction) - Wallet connection UI
- [Prisma Docs](https://www.prisma.io/docs) - Database ORM
- [Circle Developer Docs](https://developers.circle.com/) - Circle wallet and USDC developer tools

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Keep changes focused and clean
4. Run relevant builds and tests
5. Open a pull request with a clear summary

## 📄 License

No license file is included yet. Add a project license before using this code in a public production or commercial setting.

## 📞 Support

For issues or questions:

- Check browser console errors for frontend issues
- Check backend logs for API and upload issues
- Check deployment logs for Vercel or server problems
- Review Arc docs for network and wallet configuration
- Review contract tests before changing tipping logic

---

**Built for Arc Testnet | Powered by USDC tipping | Stable Post**
