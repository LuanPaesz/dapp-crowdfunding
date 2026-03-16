# 🌐 Blockchain Crowdfunding DApp

A decentralized and transparent crowdfunding platform built with **Solidity**, **React**, and **Hardhat**.  
This DApp allows users to create and contribute to fundraising campaigns directly on the blockchain — ensuring transparency, automation, and security.

---

# 📖 Overview

This project was developed as part of a **BSc Computing Final Year Project at Dorset College**.

The goal of the project is to demonstrate how **blockchain technology and smart contracts** can improve transparency and trust in crowdfunding platforms by removing reliance on centralized intermediaries.

The platform allows campaign creators to raise funds while ensuring that:

- contributions are recorded on-chain
- funds are only released if campaign goals are met
- contributors can automatically receive refunds when campaigns fail

---

# 🎯 Core Features

- Create and manage crowdfunding campaigns
- Contribute funds securely using connected wallets (MetaMask)
- Track campaign progress and raised amounts on-chain
- Automatic withdrawal for successful campaigns
- Automatic refunds for failed campaigns
- Admin moderation and campaign control
- Transparency through blockchain event logs

---

# 🧱 Architecture

dapp-crowdfunding/
│
├── frontend/ # React + Vite application
│ └── src/lib/contract.ts # Smart contract ABI and address
│
├── smart-contract/ # Solidity + Hardhat project
│ ├── contracts/Crowdfunding.sol
│ ├── scripts/sync-abi.cjs
│ └── hardhat.config.ts
│
├── docker-compose.yml # Containerized environment
├── Jenkinsfile # CI/CD pipeline configuration
└── README.md


The system follows a **decentralized architecture** where:

Frontend → interacts with smart contracts  
Smart Contract → executes crowdfunding logic  
Blockchain → stores transactions and campaign data

---

# ⚙️ Technologies Used

| Layer | Technology | Description |
|------|-------------|-------------|
| Smart Contract | Solidity | Crowdfunding business logic |
| Development | Hardhat | Compile, test and deploy contracts |
| Security | OpenZeppelin | Access control and security utilities |
| Frontend | React + Vite | Web interface |
| Blockchain Interaction | Wagmi + Viem + RainbowKit | Wallet connections |
| DevOps | Docker + Jenkins | Environment and CI/CD automation |

---

## 🚀 Quick Start (Run the Project)

Run the following commands in your terminal:

```bash
# Install frontend dependencies
cd frontend
npm install

# Install smart contract dependencies
cd ../smart-contract
npm install

# Compile smart contracts
npx hardhat compile

# Run smart contract tests
npx hardhat test

# Start a local blockchain network (optional)
npx hardhat node

# Start the frontend application
cd ../frontend
npm run dev
```

The application will start at:

```
http://localhost:5173
```

---

## 🦊 MetaMask Setup

To interact with the local blockchain network configure MetaMask with the following network:

Network Name: Hardhat Local  
RPC URL: http://127.0.0.1:8545  
Chain ID: 31337  
Currency Symbol: ETH  

You may import one of the Hardhat test accounts to simulate transactions.

---

## 🌍 Live Demo

A deployed version of the application is available at:

https://blockfund-frontend-six.vercel.app

This allows evaluators to explore the interface without installing the project locally.

---

## 🧪 Testing

Run smart contract tests:

```bash
cd smart-contract
npx hardhat test
```

Generate coverage reports:

```bash
npx hardhat coverage
```

---

## 📌 Notes for Evaluators

This repository contains the complete source code of the BlockFund project including:

- Solidity smart contracts
- React frontend application
- automated testing scripts
- CI/CD configuration

The system can be evaluated by:

1. Running the project locally using the instructions above
2. Reviewing the smart contract code and automated tests
3. Accessing the deployed frontend demo

---

## 👨‍💻 Author

Luan Bernardes Paes  
BSc Computing – Dorset College
