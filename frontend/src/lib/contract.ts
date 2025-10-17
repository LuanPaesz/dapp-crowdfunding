// frontend/src/lib/contract.ts
import type { Abi } from "viem";
import artifact from "./Crowdfund.json";

export const CROWDFUND_ADDRESS =
  "0x5FbDB2315678afecb367f032d93F642f64180aa3" as const;

export const CROWDFUND_ABI = artifact.abi as Abi;


