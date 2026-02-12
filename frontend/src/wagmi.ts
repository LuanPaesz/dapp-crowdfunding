// frontend/src/wagmi.ts
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { defineChain } from "viem";

const rpcUrl = (import.meta.env.VITE_RPC_URL as string) || "http://127.0.0.1:8545";

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

export const wagmiConfig = getDefaultConfig({
  appName: "BlockFund",
  projectId: "blockfund-demo",
  chains: [hardhatRemote],
  transports: {
    [hardhatRemote.id]: http(rpcUrl),
  },
  ssr: false,
});
