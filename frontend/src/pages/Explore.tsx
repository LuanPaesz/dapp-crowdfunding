// frontend/src/pages/Explore.tsx
import { useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import type { Abi } from "abitype";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "../lib/contract";
import CampaignCard from "../components/CampaignCard";

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
};

export default function Explore() {
  const [query, setQuery] = useState("");

  // read total number of campaigns
  const {
    data: nextIdData,
    isLoading: l1,
    error: e1,
  } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
    query: { refetchInterval: 1500 },
  });

  const nextId = Number(nextIdData ?? 0);

  // build multicall list [ getCampaign(0..nextId-1) ]
  const contracts =
    nextId > 0
      ? Array.from({ length: nextId }, (_, id) => ({
          address: CROWDFUND_ADDRESS,
          abi: CROWDFUND_ABI as unknown as Abi,
          functionName: "getCampaign" as const,
          args: [BigInt(id)],
        }))
      : [];

  const {
    data: res,
    isLoading: l2,
    error: e2,
  } = useReadContracts({
    contracts,
    allowFailure: true,
    query: { refetchInterval: 1500 },
  });

  // normalize campaigns
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
      .filter(
        (x): x is { id: number; c: Campaign } => x !== null
      ) ?? [];

  // only approved campaigns
  const approvedItems = rawItems.filter((it) => it.c.approved);

  // search filter by title/description
  const filtered =
    approvedItems.filter(({ c }) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    }) ?? [];

  // states
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
  if (!filtered.length)
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold">Explore campaigns</h1>
          <input
            type="text"
            placeholder="Search by title or description..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm"
          />
        </div>
        <p>No campaigns yet.</p>
      </div>
    );

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Explore campaigns</h1>
        <input
          type="text"
          placeholder="Search by title or description..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(({ id, c }) => (
          <CampaignCard key={id} id={id} camp={c} />
        ))}
      </div>
    </div>
  );
}
