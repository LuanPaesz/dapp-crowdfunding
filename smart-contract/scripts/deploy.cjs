const hre = require("hardhat");

async function main() {
  console.log("📦 Deploying Crowdfunding...");

  const F = await ethers.getContractFactory("Crowdfunding");
  const crowdfunding = await F.deploy();

  await crowdfunding.waitForDeployment();

  console.log(`✅ Crowdfunding deployed to: ${crowdfunding.target}`);
}

main().catch((error) => {
  console.error("❌ Deploy failed:", error);
  process.exitCode = 1;
});
