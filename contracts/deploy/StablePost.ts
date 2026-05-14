import { network } from "hardhat";

const { ethers } = await network.create();

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();

  const usdc = process.env.USDC_ADDRESS?.trim();
  if (!usdc || !ethers.isAddress(usdc)) {
    throw new Error("Set USDC_ADDRESS to Arc testnet USDC.");
  }

  const gwei = 10n ** 9n;
  const StablePost = await ethers.getContractFactory("StablePost");
  const stablePost = await StablePost.deploy(usdc, {
    maxFeePerGas: 80n * gwei,
    maxPriorityFeePerGas: 3n * gwei,
  });
  await stablePost.waitForDeployment();
  const addr = await stablePost.getAddress();
  console.log("Stable Post contract address:", addr);
  console.log("Deployer:", deployerAddr);
  
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
