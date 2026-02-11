import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { useSearchParams } from "react-router-dom";
import type { Abi } from "abitype";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "../lib/contract";
import CampaignCard from "../components/CampaignCard";
import { AccordionItem } from "../components/Accordion";
import MermaidDiagram from "../components/Mermaid";

type Campaign = {
  owner: `0x${string}`;
  title: string;
  description: string;
  goal: bigint;
  deadline: bigint;
  totalRaised: bigint;
  withdrawn: boolean;
  exists: boolean;
  approved: boolean;
  media?: string;
  held: boolean;
  reports: bigint;
  projectLink?: string;
};

export default function Explore() {
  const [params] = useSearchParams();
  const query = (params.get("q") ?? "").trim().toLowerCase();

  const { data: nextIdData, isLoading: l1, error: e1 } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
    query: { refetchInterval: 1500 },
  });

  const nextId = Number(nextIdData ?? 0);

  const contracts =
    nextId > 0
      ? Array.from({ length: nextId }, (_, id) => ({
          address: CROWDFUND_ADDRESS,
          abi: CROWDFUND_ABI as unknown as Abi,
          functionName: "getCampaign" as const,
          args: [BigInt(id)],
        }))
      : [];

  const { data: res, isLoading: l2, error: e2 } = useReadContracts({
    contracts,
    allowFailure: true,
    query: { refetchInterval: 1500 },
  });

  const rawItems =
    res
      ?.map((r, id) => {
        if (r.status !== "success") return null;
        const raw = r.result as any;
        if (!raw?.exists) return null;

        const c: Campaign = {
          ...raw,
          approved: typeof raw.approved === "boolean" ? raw.approved : true,
        };

        return { id, c };
      })
      .filter((x): x is { id: number; c: Campaign } => x !== null) ?? [];

  const approvedItems = rawItems.filter((it) => it.c.approved);

  const nowSec = Math.floor(Date.now() / 1000);
  const activeCount = approvedItems.filter(
    ({ c }) => Number(c.deadline) > nowSec && !c.withdrawn
  ).length;

  const filtered = useMemo(() => {
    if (!query) return approvedItems;
    return approvedItems.filter(({ c }) => {
      return (
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query)
      );
    });
  }, [approvedItems, query]);

  if (l1 || l2) return <div className="p-6">Loading campaigns…</div>;
  if (e1)
    return (
      <div className="p-6 text-red-400">
        Error (nextId): {String((e1 as any)?.message ?? e1)}
      </div>
    );
  if (e2)
    return (
      <div className="p-6 text-red-400">
        Error (campaigns): {String((e2 as any)?.message ?? e2)}
      </div>
    );

  // -------------------- Mermaid examples (substituir pelos seus) --------------------
  const mermaidComponent = `
flowchart LR
  User((Backer)) -->|Donate| DApp[BlockFund UI]
  Creator((Creator)) -->|Create Campaign| DApp
  DApp -->|read/write| SC[(Crowdfunding Smart Contract)]
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
    <div className="p-6 space-y-10">
      {/* HERO / INTRO */}
      <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-black/20 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold">Explore campaigns</h1>
            <p className="text-white/70 mt-2 max-w-2xl">
              BlockFund is a transparent crowdfunding platform powered by blockchain.
              Backers can support campaigns with on-chain contributions, while creators
              build trust through verifiable progress and auditing features.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60">Mission</div>
                <div className="mt-1 text-sm text-white/80">
                  Enable transparent fundraising with on-chain accountability.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60">Vision</div>
                <div className="mt-1 text-sm text-white/80">
                  Make crowdfunding safer, auditable, and globally accessible.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60">Values</div>
                <div className="mt-1 text-sm text-white/80">
                  Transparency • Trust • Community • Security
                </div>
              </div>
            </div>

            <p className="text-xs text-white/45 mt-4">
              Showing {filtered.length} campaign(s) — {activeCount} currently LIVE.
              {!!query && (
                <>
                  {" "}Filter: <span className="text-white/70">"{query}"</span>
                </>
              )}
            </p>
          </div>

          {/* “Cofounder” style card */}
          <div className="w-full lg:w-[340px] rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-semibold">Cofounder</div>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <span className="text-purple-300 font-bold">L</span>
              </div>
              <div>
                <div className="text-sm font-semibold">Luan Paes</div>
                <div className="text-xs text-white/60">
                  Blockchain / Full-stack Developer
                </div>
              </div>
            </div>
            <div className="text-xs text-white/60 mt-4">
              This project is part of an academic assessment and includes user testing
              with external participants.
            </div>
          </div>
        </div>
      </section>

      {/* TUTORIALS / ONBOARDING */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Get started</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <AccordionItem title="1) Create your wallet (MetaMask) + connect to the right network" defaultOpen>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Install MetaMask extension on Chrome/Brave.</li>
              <li>Create a new wallet and save your seed phrase safely (never share it).</li>
              <li>Open MetaMask → Networks → Add network.</li>
              <li>Select the test network you are using (e.g., Sepolia) and switch to it.</li>
              <li>Return to BlockFund and click “Connect Wallet”.</li>
            </ol>
          </AccordionItem>

          <AccordionItem title="2) Get fake money for testing (testnet faucet)">
            <div className="space-y-2">
              <p>
                For public testers, the recommended approach is using a testnet (e.g., Sepolia).
                Testers can request test ETH from a faucet.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Copy your wallet address in MetaMask.</li>
                <li>Use a Sepolia faucet to request test ETH.</li>
                <li>Wait a minute and refresh MetaMask balance.</li>
              </ul>
              <p className="text-white/60 text-xs">
                ⚠️ Never share private keys. Test ETH has no real value.
              </p>
            </div>
          </AccordionItem>

          <AccordionItem title="3) Create your first campaign">
            <ol className="list-decimal pl-5 space-y-2">
              <li>Go to <b>Create</b>.</li>
              <li>Fill title + description.</li>
              <li>Add media URL (image or YouTube) and a project link (GitHub/Website).</li>
              <li>Set goal (ETH) and deadline (days).</li>
              <li>Submit and confirm transaction in MetaMask.</li>
              <li>Your campaign will appear in Explore once approved (if approval is enabled).</li>
            </ol>
          </AccordionItem>

          <AccordionItem title="4) Donate to a campaign">
            <ol className="list-decimal pl-5 space-y-2">
              <li>Open a campaign card or click into campaign detail.</li>
              <li>Enter amount in ETH.</li>
              <li>Click <b>Contribute</b> and confirm in MetaMask.</li>
              <li>After confirmation, the raised amount updates automatically.</li>
            </ol>
          </AccordionItem>
        </div>
      </section>

      {/* HOW CROWDFUNDING WORKS */}
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold">How crowdfunding works (and why blockchain helps)</h2>
        <div className="mt-3 text-sm text-white/75 space-y-2">
          <p>
            Crowdfunding allows creators to raise funds from many backers to finance a project or idea.
            Traditional platforms rely on centralized intermediaries to track funds and updates.
          </p>
          <p>
            With blockchain, contributions and key events can be recorded on-chain, improving transparency and auditability.
            In BlockFund, donations are executed through smart contracts and can be verified publicly.
          </p>
        </div>
      </section>

      {/* DIAGRAMS */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">System diagrams</h2>
        <p className="text-sm text-white/60">
          These diagrams are rendered with Mermaid. Replace the sample code with your final diagrams.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-semibold">High-level component view</div>
            <MermaidDiagram code={mermaidComponent} />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold">Donation flow (sequence)</div>
            <MermaidDiagram code={mermaidSequence} />
          </div>
        </div>
      </section>

      {/* CAMPAIGNS GRID */}
      <section className="space-y-4">
        {!filtered.length ? (
          <p className="text-white/60">
            No campaigns found. Try a different search.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(({ id, c }) => (
              <CampaignCard key={id} id={id} camp={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
