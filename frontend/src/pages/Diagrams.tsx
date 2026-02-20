import MermaidDiagram from "../components/Mermaid";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function Diagrams() {
  const mermaidComponent = `
flowchart LR
  User((Backer)) -->|Donate| UI[BlockFund UI]
  Creator((Creator)) -->|Create Campaign| UI
  UI -->|read/write| SC[(Crowdfunding Smart Contract)]
  SC -->|Events| Chain[(Ethereum / Testnet)]
  Admin((Admin)) -->|Approve / Hold| SC
`;

  const mermaidSequence = `
sequenceDiagram
  participant U as User
  participant UI as BlockFund UI
  participant SC as Smart Contract
  U->>UI: Enter amount + click Contribute
  UI->>SC: contribute(campaignId) + value ETH
  SC-->>UI: tx receipt + Contributed event
  UI-->>U: Updated raised amount (live)
`;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-purple-500/12 via-white/6 to-black/25 p-6">
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-purple-500/22 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-24 h-72 w-72 rounded-full bg-fuchsia-500/12 blur-3xl" />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">System diagrams</h1>
            <p className="text-white/60 mt-1">
              Architecture and transaction flow used in BlockFund.
            </p>
          </div>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/6 to-black/25 p-5">
          <h2 className="text-lg font-semibold">High-level component view</h2>
          <p className="text-sm text-white/60 mt-1">
            Users interact with the UI, which reads/writes to the smart contract. The contract emits events to the chain.
          </p>
          <div className="mt-4">
            <MermaidDiagram code={mermaidComponent} />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/6 to-black/25 p-5">
          <h2 className="text-lg font-semibold">Donation flow (sequence)</h2>
          <p className="text-sm text-white/60 mt-1">
            A user submits a contribution → MetaMask signs → smart contract executes → UI updates live.
          </p>
          <div className="mt-4">
            <MermaidDiagram code={mermaidSequence} />
          </div>
        </div>
      </div>
    </div>
  );
}