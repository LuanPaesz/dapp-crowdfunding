// frontend/src/lib/contract.ts
import artifact from "./Crowdfunding.json";
import deployed from "./deployed.json";
import type { Abi } from "abitype";

export const CROWDFUND_ABI = (artifact as any).abi as Abi;

const envAddr = (import.meta.env.VITE_CROWDFUND_ADDRESS as string | undefined)?.trim();
const fileAddr = (deployed as any).CROWDFUND_ADDRESS as string | undefined;

// prioridade: ENV -> deployed.json
const addr =
  (envAddr && envAddr.startsWith("0x") ? envAddr : undefined) ||
  (fileAddr && fileAddr.startsWith("0x") ? fileAddr : undefined) ||
  "";

// validação
if (!addr || typeof addr !== "string" || !addr.startsWith("0x")) {
  console.error("❌ Invalid CROWDFUND_ADDRESS. env:", envAddr, "file:", fileAddr);
} else {
  console.log("✅ Using CROWDFUND_ADDRESS:", addr);
}

export const CROWDFUND_ADDRESS = addr as `0x${string}`;
