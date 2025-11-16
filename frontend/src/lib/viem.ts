import { createPublicClient, http } from "viem";
import { localhost } from "viem/chains";
// Use "mainnet" se for rede pública, ou "localhost" para hardhat local

export const publicClient = createPublicClient({
  chain: localhost,  // ou mainnet/testnet conforme sua rede
  transport: http()
});
