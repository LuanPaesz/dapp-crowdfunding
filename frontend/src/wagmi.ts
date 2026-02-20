// frontend/src/wagmi.ts
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { defineChain } from "viem";

// Limpa vírgulas, espaços e barra final
const rawRpc = (import.meta.env.VITE_RPC_URL as string | undefined) ?? "";
const rpcUrl =
  rawRpc.trim().replace(/,+$/, "").replace(/\/+$/, "") ||
  "https://blockfund-rpc.duckdns.org";

// WalletConnect / Reown projectId (pega do .env)
const wcProjectId =
  (import.meta.env.VITE_WC_PROJECT_ID as string | undefined)?.trim() || "blockfund-dev";

// Hardhat chain (31337)
export const hardhatRemote = defineChain({
  id: 31337,
  name: "Hardhat (Remote)",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [rpcUrl] },
    public: { http: [rpcUrl] },
  },
  blockExplorers: {
    default: { name: "None", url: "about:blank" },
  },
  testnet: true,
});

console.log("✅ Using RPC:", rpcUrl);
console.log("✅ Using WC Project ID:", wcProjectId);

export const wagmiConfig = getDefaultConfig({
  appName: "BlockFund",
  // ✅ use um Project ID real no .env para remover 400/403
  projectId: wcProjectId,
  chains: [hardhatRemote],
  transports: {
    [hardhatRemote.id]: http(rpcUrl, {
      timeout: 20_000,
    }),
  },
  ssr: false,
});
