import { isAddress, type Abi, type Address } from "viem";
import StablePostArtifact from "../abi/StablePost.json";

export const stablePostAbi = StablePostArtifact.abi as Abi;

export function stablePostAddress(): Address | undefined {
  const v = import.meta.env.VITE_STABLEPOST_ADDRESS?.trim();
  if (!v || !isAddress(v)) return undefined;
  return v as Address;
}
