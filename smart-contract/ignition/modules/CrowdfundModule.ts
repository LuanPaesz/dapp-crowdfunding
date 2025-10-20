import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CrowdfundingModule", (m) => {
  const Crowdfunding = m.contract("Crowdfunding"); // usa artifacts de contracts/Crowdfund.sol
  return { Crowdfunding };
});
