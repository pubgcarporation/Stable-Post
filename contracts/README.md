# Stable Post Contracts

Hardhat workspace for the Stable Post tipping contract on Arc testnet.

## Contract

`contract/StablePost.sol` stores creator balances from USDC tips, tracks per-post earnings, collects a platform fee, and lets creators withdraw. `contract/Mocks/MockERC20.sol` is a 6-decimal mock token for local tests.

## Setup

```bash
npm install
```

Create `contracts/.env` when deploying:

```env
PRIVATE_KEY=your_deployer_private_key
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
ARC_TESTNET_CHAIN_ID=5042002
USDC_ADDRESS=0x3600000000000000000000000000000000000000
```

Never commit real private keys.

## Scripts

```bash
npm run compile
npm test
npm run deploy:arc-testnet
```

After deployment, copy the printed Stable Post contract address into `backend/.env` as `STABLEPOST_ADDRESS`.

## Network

The `arcTestnet` Hardhat network defaults to:

- RPC: `https://rpc.testnet.arc.network`
- Chain ID: `5042002`
- Solidity: `0.8.20`
