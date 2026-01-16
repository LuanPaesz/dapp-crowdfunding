// frontend/src/lib/contract.ts
import artifact from "./Crowdfunding.json";
import deployed from "./deployed.json";

export const CROWDFUND_ABI = artifact.abi;

const addr = (deployed as any).CROWDFUND_ADDRESS;

if (!addr || typeof addr !== "string" || !addr.startsWith("0x")) {

  console.error("❌ Invalid CROWDFUND_ADDRESS in deployed.json:", addr);
}

export const CROWDFUND_ADDRESS = addr as `0x${string}`;
