// frontend/src/contracts/crowdfunding.ts

// ✅ Importa direto do artifacts do smart-contract (monorepo)
import CrowdfundingArtifact from "../../../smart-contract/artifacts/contracts/Crowdfunding.sol/Crowdfunding.json";

// Ajuste se seu caminho for diferente.
// Ex: artifacts/contracts/Crowdfund.sol/Crowdfund.json

export const CROWDFUND_ABI = CrowdfundingArtifact.abi;

export const CROWDFUND_ADDRESS = (import.meta.env.VITE_CROWDFUND_ADDRESS as string) ?? "";
