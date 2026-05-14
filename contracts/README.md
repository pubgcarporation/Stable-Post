# Stable Post Contracts

Hardhat workspace for the Stable Post tipping contract deployed on Arc Testnet.

## Overview

`contract/StablePost.sol` is the on-chain payment layer for Stable Post. It accepts USDC tips, prevents self-tips, applies a platform fee, tracks creator balances, stores per-post earnings, and lets creators withdraw their available balance.

`contract/Mocks/MockERC20.sol` is used only in tests as a local ERC20 token.

Current app contract on Arc Testnet:

```text
0x0E15F0c661cD595c9c4f4256042953204e45e74C
```

## Contract Features

- USDC-based creator tipping
- Per-post earnings tracking through `postEarnings`
- Creator balance accounting through `creatorBalances`
- Platform fee accounting through `platformFeesCollected`
- Creator withdrawals with `withdraw`
- Owner platform fee updates with `setPlatformFee`
- Owner platform fee withdrawal with `withdrawPlatformFees`
- Reentrancy protection for transfer flows

## Project Structure

```text
contracts/
|-- contract/
|   |-- StablePost.sol
|   `-- Mocks/MockERC20.sol
|-- deploy/
|   `-- StablePost.ts
|-- tests/
|   `-- StablePost.test.ts
|-- hardhat.config.ts
|-- package.json
`-- README.md
```

## Setup

Install dependencies:

```bash
npm ci
```

Create `contracts/.env` before deploying:

```env
PRIVATE_KEY=your_deployer_private_key
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
ARC_TESTNET_CHAIN_ID=5042002
USDC_ADDRESS=0xArcTestnetUsdc
```

Never commit private keys or funded wallet secrets.

## Commands

Compile contracts:

```bash
npm run compile
```

Run tests:

```bash
npm test
```

Deploy to Arc Testnet:

```bash
npm run deploy:arc-testnet
```

After deployment, copy the printed Stable Post contract address into:

- `backend/.env` as `STABLEPOST_ADDRESS`
- `frontend/.env` as `VITE_STABLEPOST_ADDRESS`

## Arc Testnet

The `arcTestnet` Hardhat network defaults to:

- RPC: `https://rpc.testnet.arc.network`
- Chain ID: `5042002`
- Native gas token: `USDC`
- Explorer: `https://testnet.arcscan.app`
- Solidity: `0.8.20`

## Deployment Notes

The deploy script expects `USDC_ADDRESS` to be set. It deploys `StablePost` with gas settings suitable for Arc Testnet and prints the deployed contract address plus deployer address.

Before deploying, confirm:

- The deployer wallet has Arc Testnet USDC for gas.
- `USDC_ADDRESS` is the Arc Testnet USDC token used by the app.
- The backend and frontend env files are updated with the new contract address.
