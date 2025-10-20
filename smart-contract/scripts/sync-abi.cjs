// cjs para rodar em qualquer setup
const fs = require("fs");
const path = require("path");

const source = path.join(__dirname, "..", "artifacts", "contracts", "Crowdfunding.sol", "Crowdfunding.json");
const destDir = path.join(__dirname, "..", "frontend", "src", "lib");
const dest = path.join(destDir, "Crowdfunding.json");

if (!fs.existsSync(source)) {
  console.error("ABI não encontrado. Rode `npm run compile` primeiro.");
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(source, dest);
console.log("✅ ABI sincronizado para:", dest);
