// frontend/src/lib/contract.ts
import type { Abi } from "abitype";
import bundle from "./crowdfund.bundle.json";

/**
 * Single source of truth:
 * - Contract address + ABI exported directly from the VM deployment artifacts.
 * This prevents ABI/address mismatches after redeploys.
 */
export const CROWDFUND_ADDRESS = (bundle as any).CROWDFUND_ADDRESS as `0x${string}`;
export const CROWDFUND_ABI = (bundle as any).ABI as Abi;

function isAddress(x: unknown): x is `0x${string}` {
  return typeof x === "string" && x.startsWith("0x") && x.length === 42;
}

if (!isAddress(CROWDFUND_ADDRESS)) {
  console.error("❌ Invalid CROWDFUND_ADDRESS from bundle:", CROWDFUND_ADDRESS);
  throw new Error("Invalid CROWDFUND_ADDRESS in crowdfund.bundle.json");
}

console.log("✅ Using CROWDFUND_ADDRESS:", CROWDFUND_ADDRESS);

try {
  const getFn = (CROWDFUND_ABI as any[]).find(
    (x) => x?.type === "function" && x?.name === "getCampaign"
  );

  console.log(
    "✅ ABI getCampaign outputs:",
    getFn?.outputs?.length,
    getFn?.outputs?.map((o: any) => `${o.name || "?"}:${o.type}`),
    "tuple components:",
    getFn?.outputs?.[0]?.components?.length ?? 0
  );
} catch {}
