# 🌐 Blockchain Crowdfunding DApp

A decentralized and transparent crowdfunding platform built with **Solidity**, **React**, and **Hardhat**.  
This DApp allows users to create and contribute to fundraising campaigns directly on the blockchain — ensuring full transparency and security.

---

## 📖 Overview

This project is part of my **BSc in Computing** at **CCT College Dublin**.  
It aims to demonstrate a **real-world decentralized application (DApp)** integrating **smart contracts**, **frontend interaction**, and **DevOps automation** using **Docker** and **Jenkins**.

### 🎯 Core Features
- Create and manage crowdfunding campaigns
- Contribute funds securely using connected wallets (e.g., MetaMask)
- Track progress and raised amounts on-chain
- Withdraw or refund funds based on campaign goals
- Full blockchain transparency via event logs

---

## 🧱 Architecture

📦 dapp-crowdfunding/
├── frontend/ → React + Vite app (Wagmi + RainbowKit)
│ └── src/lib/contract.ts → Smart contract ABI + address
├── smart-contract/ → Solidity + Hardhat project
│ ├── contracts/Crowdfunding.sol
│ ├── scripts/sync-abi.cjs
│ └── hardhat.config.ts
├── docker-compose.yml → Containerized setup (frontend + smart-contract)
└── Jenkinsfile → CI/CD pipeline configuration

## ⚙️ Technologies Used

| Layer | Technology | Description |
|-------|-------------|-------------|
| Smart Contract | **Solidity** | Core logic for crowdfunding campaigns |
| Development | **Hardhat** | Compile, test, and deploy contracts locally |
| Security | **OpenZeppelin** | Reentrancy protection and utilities |
| Frontend | **React + Vite** | Web interface for campaign management |
| Blockchain Interaction | **Wagmi + Viem + RainbowKit** | Wallet connections and contract calls |
| DevOps | **Docker + Jenkins** | Automated CI/CD and environment orchestration |

