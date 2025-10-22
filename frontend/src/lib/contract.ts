import artifact from "./Crowdfunding.json";
import deployed from "./deployed.json";

export const CROWDFUND_ABI = artifact.abi;
export const CROWDFUND_ADDRESS = (deployed as { CROWDFUND_ADDRESS: `0x${string}` }).CROWDFUND_ADDRESS;
