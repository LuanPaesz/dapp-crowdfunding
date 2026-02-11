// frontend/src/lib/contract.ts
import artifact from "./Crowdfunding.json";
import deployed from "./deployed.json";

export const CROWDFUND_ABI = (artifact as any).abi;

const envAddr = (import.meta.env.VITE_CROWDFUND_ADDRESS as string | undefined)?.trim();
const fileAddr = (deployed as any).CROWDFUND_ADDRESS as string | undefined;

const addr = (envAddr && envAddr.startsWith("0x") ? envAddr : fileAddr) ?? "";

if (!addr || typeof addr !== "string" || !addr.startsWith("0x")) {
  console.error("❌ Invalid CROWDFUND_ADDRESS. env:", envAddr, "file:", fileAddr);
}

export const CROWDFUND_ADDRESS = addr as `0x${string}`;
