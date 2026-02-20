/* eslint-disable */
const fs = require("fs");
const path = require("path");

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

function newestDir(dir) {
  const items = fs.readdirSync(dir).map((name) => ({
    name,
    full: path.join(dir, name),
  })).filter((x) => fs.statSync(x.full).isDirectory());

  if (!items.length) return null;
  items.sort((a, b) => fs.statSync(b.full).mtimeMs - fs.statSync(a.full).mtimeMs);
  return items[0].full;
}

(function main() {
  const ROOT = path.resolve(__dirname, ".."); // smart-contract/
  const FRONTEND_LIB = path.resolve(ROOT, "../frontend/src/lib");

  // 1) Copy ABI
  const abiSrc = path.join(
    ROOT,
    "artifacts/contracts/Crowdfunding.sol/Crowdfunding.json"
  );

  if (!exists(abiSrc)) {
    console.error("❌ ABI not found:", abiSrc);
    process.exit(1);
  }

  const abiDst = path.join(FRONTEND_LIB, "Crowdfunding.json");
  fs.mkdirSync(FRONTEND_LIB, { recursive: true });
  fs.copyFileSync(abiSrc, abiDst);
  console.log("✅ Copied ABI ->", abiDst);

  // 2) Resolve deployed address (Ignition)
  const deploymentsRoot = path.join(ROOT, "ignition/deployments");
  if (!exists(deploymentsRoot)) {
    console.error("❌ ignition/deployments not found:", deploymentsRoot);
    process.exit(1);
  }

  const latestDeployment = newestDir(deploymentsRoot);
  if (!latestDeployment) {
    console.error("❌ No deployments folder found inside:", deploymentsRoot);
    process.exit(1);
  }

  const deployedAddressesPath = path.join(latestDeployment, "deployed_addresses.json");
  if (!exists(deployedAddressesPath)) {
    console.error("❌ deployed_addresses.json not found:", deployedAddressesPath);
    console.error("   Looked in:", latestDeployment);
    process.exit(1);
  }

  const deployed = readJson(deployedAddressesPath);

  // chave padrão do ignition
  const key = "CrowdfundModule#Crowdfunding";
  const addr = deployed[key];

  if (!addr || typeof addr !== "string" || !addr.startsWith("0x") || addr.length !== 42) {
    console.error("❌ Could not find valid address in deployed_addresses.json");
    console.error("   Expected key:", key);
    console.error("   File:", deployedAddressesPath);
    console.error("   Content keys:", Object.keys(deployed));
    process.exit(1);
  }

  const deployedJsonPath = path.join(FRONTEND_LIB, "deployed.json");
  writeJson(deployedJsonPath, { CROWDFUND_ADDRESS: addr });

  console.log("✅ Synced address ->", deployedJsonPath, addr);
  console.log("✅ Done.");
})();
