import { ethers } from "ethers";
import type { InterfaceAbi } from "ethers";
import type { AppEnv } from "../config/env";
import StablePostArtifact from "../abi/StablePost.json";

const abi = StablePostArtifact.abi as unknown as InterfaceAbi;

export function createStablePostReader(env: AppEnv) {
  const provider = new ethers.JsonRpcProvider(env.rpcUrl, env.chainId);
  const stablePost = new ethers.Contract(
    env.stablePostAddress,
    abi,
    provider
  );
  return { stablePost, provider };
}
