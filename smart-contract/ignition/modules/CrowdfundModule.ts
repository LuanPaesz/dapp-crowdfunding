import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CrowdfundModule", (m) => {
  const crowdfund = m.contract("Crowdfund"); // usa artifacts de contracts/Crowdfund.sol
  return { crowdfund };
});
