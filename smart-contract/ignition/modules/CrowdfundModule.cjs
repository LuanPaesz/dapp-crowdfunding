const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("CrowdfundModule", (m) => {
  // Tem que ser exatamente o nome do contract no .sol:
  const crowdfunding = m.contract("Crowdfunding");
  return { crowdfunding };
});
