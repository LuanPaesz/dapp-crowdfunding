const hre = require("hardhat");

async function main() {
  // Troque pelo NOME exato do seu contrato
  const Factory = await hre.ethers.getContractFactory("CrowdFunding");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  console.log("CrowdFunding deployed to:", await contract.getAddress());
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
