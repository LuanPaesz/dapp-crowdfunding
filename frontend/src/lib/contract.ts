import type { Abi } from "abitype";
import bundleJson from "./crowdfund.bundle.json";

type AbiFunction = {
  type?: string;
  name?: string;
  outputs?: Array<{
    name?: string;
    type?: string;
    components?: Array<unknown>;
  }>;
};

type ContractBundle = {
  CROWDFUND_ADDRESS: `0x${string}`;
  ABI: Abi;
};

const bundle = bundleJson as ContractBundle;

export const CROWDFUND_ADDRESS = bundle.CROWDFUND_ADDRESS;
export const CROWDFUND_ABI = bundle.ABI;

function isAddress(value: unknown): value is `0x${string}` {
  return (
    typeof value === "string" &&
    value.startsWith("0x") &&
    value.length === 42
  );
}

if (!isAddress(CROWDFUND_ADDRESS)) {
  console.error("❌ Invalid CROWDFUND_ADDRESS from bundle:", CROWDFUND_ADDRESS);
  throw new Error("Invalid CROWDFUND_ADDRESS in crowdfund.bundle.json");
}

const isDev = import.meta.env?.DEV === true;

if (isDev) {
  console.log("✅ Using CROWDFUND_ADDRESS:", CROWDFUND_ADDRESS);

  try {
    const abiArray = CROWDFUND_ABI as unknown as AbiFunction[];

    const getCampaignFunction = abiArray.find(
      (item) => item.type === "function" && item.name === "getCampaign"
    );

    const outputsLength = getCampaignFunction?.outputs?.length ?? 0;
    const outputSummary =
      getCampaignFunction?.outputs?.map(
        (output) => `${output.name ?? "?"}:${output.type ?? "unknown"}`
      ) ?? [];
    const tupleComponentsLength =
      getCampaignFunction?.outputs?.[0]?.components?.length ?? 0;

    console.log(
      "✅ ABI getCampaign outputs:",
      outputsLength,
      outputSummary,
      "tuple components:",
      tupleComponentsLength
    );
  } catch (error) {
    console.warn("⚠️ Could not inspect ABI getCampaign outputs:", error);
  }
}