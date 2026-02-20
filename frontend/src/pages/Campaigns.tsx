import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import type { Abi } from "abitype";
import { useSearchParams } from "react-router-dom";
import { formatUnits } from "viem";
import { X } from "lucide-react";

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
  projectLink?: string;
};

function toNum(v?: string | null) {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function Campaigns() {
  const [params, setParams] = useSearchParams();

  const q = (params.get("q") ?? "").trim().toLowerCase();
  const onlyApproved = params.get("approved") === "1";
  const hasMedia = params.get("media") === "1";

  const minGoal = toNum(params.get("minGoal"));
  const maxGoal = toNum(params.get("maxGoal"));
  const minRaised = toNum(params.get("minRaised"));
  const maxRaised = toNum(params.get("maxRaised"));

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

  const items =
    res
      ?.map((r, id) => {
        if (!r || r.status !== "success") return null;
        const raw = r.result as any;
        if (!raw?.exists) return null;

        const c: Campaign = {
          ...raw,
          approved: typeof raw.approved === "boolean" ? raw.approved : true,
        };

        return { id, c };
      })
      .filter((x): x is { id: number; c: Campaign } => x !== null) ?? [];

  const filtered = useMemo(() => {
    let out = items;

    if (onlyApproved) out = out.filter((x) => x.c.approved);
    if (hasMedia) out = out.filter((x) => !!x.c.media);

    if (q) {
      out = out.filter(({ c }) => {
        return c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
      });
    }

    if (minGoal != null) out = out.filter(({ c }) => Number(formatUnits(c.goal, 18)) >= minGoal);
    if (maxGoal != null) out = out.filter(({ c }) => Number(formatUnits(c.goal, 18)) <= maxGoal);
    if (minRaised != null)
      out = out.filter(({ c }) => Number(formatUnits(c.totalRaised, 18)) >= minRaised);
    if (maxRaised != null)
      out = out.filter(({ c }) => Number(formatUnits(c.totalRaised, 18)) <= maxRaised);

    out = [...out].sort((a, b) => b.id - a.id);
    return out;
  }, [items, onlyApproved, hasMedia, q, minGoal, maxGoal, minRaised, maxRaised]);

  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  }

  function clearAll() {
    setParams(new URLSearchParams(), { replace: true });
  }

  const hasAnyFilter =
    !!q ||
    onlyApproved ||
    hasMedia ||
    minGoal != null ||
    maxGoal != null ||
    minRaised != null ||
    maxRaised != null;

  if (l1 || l2) return <div className="p-6">Loading campaigns…</div>;
  if (e1) return <div className="p-6 text-red-400">Error: {String(e1)}</div>;
  if (e2) return <div className="p-6 text-red-400">Error: {String(e2)}</div>;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-purple-500/14 via-white/6 to-black/25 p-6">
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-purple-500/22 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-fuchsia-500/12 blur-3xl" />

        <h1 className="text-2xl font-bold">Campaigns</h1>
        <p className="text-white/60 mt-1">Full list with clean filters.</p>

        {/* FILTER BAR */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-xs text-white/50">Search</div>
            <input
              value={q}
              onChange={(e) => set("q", e.target.value)}
              placeholder="title or description..."
              className="w-full bg-transparent outline-none text-sm placeholder:text-white/35"
            />
          </div>

          <div className="md:col-span-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-xs text-white/50">Goal (ETH)</div>
            <div className="flex gap-2">
              <input
                value={minGoal ?? ""}
                onChange={(e) => set("minGoal", e.target.value)}
                placeholder="min"
                className="w-1/2 bg-transparent outline-none text-sm placeholder:text-white/35"
              />
              <input
                value={maxGoal ?? ""}
                onChange={(e) => set("maxGoal", e.target.value)}
                placeholder="max"
                className="w-1/2 bg-transparent outline-none text-sm placeholder:text-white/35"
              />
            </div>
          </div>

          <div className="md:col-span-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-xs text-white/50">Raised (ETH)</div>
            <div className="flex gap-2">
              <input
                value={minRaised ?? ""}
                onChange={(e) => set("minRaised", e.target.value)}
                placeholder="min"
                className="w-1/2 bg-transparent outline-none text-sm placeholder:text-white/35"
              />
              <input
                value={maxRaised ?? ""}
                onChange={(e) => set("maxRaised", e.target.value)}
                placeholder="max"
                className="w-1/2 bg-transparent outline-none text-sm placeholder:text-white/35"
              />
            </div>
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={onlyApproved}
                onChange={(e) => set("approved", e.target.checked ? "1" : "")}
              />
              Approved
            </label>

            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={hasMedia}
                onChange={(e) => set("media", e.target.checked ? "1" : "")}
              />
              Media
            </label>

            {hasAnyFilter && (
              <button
                onClick={clearAll}
                className="ml-auto inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="text-sm text-white/60">
        Showing <span className="text-white/80">{filtered.length}</span> campaign(s).
      </div>

      {!filtered.length ? (
        <div className="text-white/60 text-sm">No campaigns match your filters.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(({ id, c }) => (
            <CampaignCard key={id} id={id} camp={c} />
          ))}
        </div>
      )}
    </div>
  );
}