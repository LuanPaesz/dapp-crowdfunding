import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { defineChain } from "viem";

const rpcUrl = import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545";

export const hardhatLocal = defineChain({
  id: 31337,
  name: "Hardhat Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [rpcUrl] },
    public: { http: [rpcUrl] },
  },
  blockExplorers: {
    default: { name: "Hardhat", url: "http://127.0.0.1:8545" },
  },
  testnet: true,
});

export const wagmiConfig = getDefaultConfig({
  appName: "BlockFund",
  projectId: "blockfund-demo", // (pode ser qualquer string se você não usa WalletConnect cloud)
  chains: [hardhatLocal],
  transports: {
    [hardhatLocal.id]: http(rpcUrl),
  },
});
