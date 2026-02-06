// frontend/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { WagmiProvider, http } from "wagmi";
import { hardhat } from "wagmi/chains";
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

// ✅ RPC vem do .env (fallback para localhost)
const RPC_URL =
  (import.meta.env.VITE_RPC_URL as string) || "http://127.0.0.1:8545";

const config = getDefaultConfig({
  appName: "Crowdfund DApp",
  projectId: "demo", // ok para ambiente local (WalletConnect cloud não necessário)
  chains: [hardhat],
  transports: {
    [hardhat.id]: http(RPC_URL),
  },
  ssr: false,
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#7c3aed",
            accentColorForeground: "white",
            borderRadius: "large",
            overlayBlur: "small",
          })}
          coolMode
          showRecentTransactions
        >
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
