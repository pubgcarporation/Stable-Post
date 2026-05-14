import "dotenv/config";
import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { defineConfig } from "hardhat/config";

function normalizedPrivateKey(): string[] {
  const pk = process.env.PRIVATE_KEY?.trim();
  if (!pk) return [];
  return [pk.startsWith("0x") ? pk : `0x${pk}`];
}

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.20",
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
    },
  },
  paths: {
    sources: "./contract",
    tests: "./tests",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    arcTestnet: {
      type: "http",
      chainType: "l1",
      url:
        process.env.ARC_TESTNET_RPC_URL ??
        "https://rpc.testnet.arc.network",
      chainId: Number(process.env.ARC_TESTNET_CHAIN_ID ?? "5042002"),
      accounts: normalizedPrivateKey(),
    },
  },
});
