import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useReadContract, useReadContracts } from "wagmi";
import type { Abi } from "abitype";
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

type CampaignRow = {
  id: number;
  c: Campaign;
};

function toNum(value?: string | null) {
  if (!value) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

export default function Campaigns() {
  const [params, setParams] = useSearchParams();

  const query = (params.get("q") ?? "").trim().toLowerCase();
  const onlyApproved = params.get("approved") === "1";
  const hasMedia = params.get("media") === "1";

  const minGoal = toNum(params.get("minGoal"));
  const maxGoal = toNum(params.get("maxGoal"));
  const minRaised = toNum(params.get("minRaised"));
  const maxRaised = toNum(params.get("maxRaised"));

  const {
    data: nextIdData,
    isLoading: isLoadingCount,
    error: countError,
  } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
    query: { refetchInterval: 1500 },
  });

  const nextId = Number(nextIdData ?? 0n);

  const contracts = useMemo(() => {
    if (nextId <= 0) {
      return [];
    }

    return Array.from({ length: nextId }, (_, id) => ({
      address: CROWDFUND_ADDRESS,
      abi: CROWDFUND_ABI as Abi,
      functionName: "getCampaign" as const,
      args: [BigInt(id)],
    }));
  }, [nextId]);

  const {
    data: results,
    isLoading: isLoadingCampaigns,
    error: campaignsError,
  } = useReadContracts({
    contracts,
    allowFailure: true,
    query: {
      refetchInterval: 1500,
      enabled: contracts.length > 0,
    },
  });

  const items = useMemo<CampaignRow[]>(() => {
    return (
      results?.flatMap((result, id) => {
        if (result?.status !== "success") {
          return [];
        }

        const rawCampaign = result.result as Partial<Campaign> | undefined;

        if (!rawCampaign?.exists) {
          return [];
        }

        const campaign: Campaign = {
          owner: rawCampaign.owner as `0x${string}`,
          title: rawCampaign.title ?? "",
          description: rawCampaign.description ?? "",
          goal: rawCampaign.goal ?? 0n,
          deadline: rawCampaign.deadline ?? 0n,
          totalRaised: rawCampaign.totalRaised ?? 0n,
          withdrawn: rawCampaign.withdrawn ?? false,
          exists: rawCampaign.exists ?? false,
          approved:
            typeof rawCampaign.approved === "boolean" ? rawCampaign.approved : true,
          media: rawCampaign.media,
          held: rawCampaign.held ?? false,
          reports: rawCampaign.reports ?? 0n,
          projectLink: rawCampaign.projectLink,
        };

        return [{ id, c: campaign }];
      }) ?? []
    );
  }, [results]);

  const filtered = useMemo(() => {
    let output = items;

    if (onlyApproved) {
      output = output.filter((item) => item.c.approved);
    }

    if (hasMedia) {
      output = output.filter((item) => Boolean(item.c.media));
    }

    if (query) {
      output = output.filter(({ c }) => {
        return (
          c.title.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query)
        );
      });
    }

    if (minGoal !== null) {
      output = output.filter(
        ({ c }) => Number(formatUnits(c.goal, 18)) >= minGoal
      );
    }

    if (maxGoal !== null) {
      output = output.filter(
        ({ c }) => Number(formatUnits(c.goal, 18)) <= maxGoal
      );
    }

    if (minRaised !== null) {
      output = output.filter(
        ({ c }) => Number(formatUnits(c.totalRaised, 18)) >= minRaised
      );
    }

    if (maxRaised !== null) {
      output = output.filter(
        ({ c }) => Number(formatUnits(c.totalRaised, 18)) <= maxRaised
      );
    }

    return [...output].sort((left, right) => right.id - left.id);
  }, [items, onlyApproved, hasMedia, query, minGoal, maxGoal, minRaised, maxRaised]);

  function setParam(key: string, value: string) {
    const nextParams = new URLSearchParams(params);

    if (!value) {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }

    setParams(nextParams, { replace: true });
  }

  function clearAll() {
    setParams(new URLSearchParams(), { replace: true });
  }

  const hasAnyFilter =
    Boolean(query) ||
    onlyApproved ||
    hasMedia ||
    minGoal !== null ||
    maxGoal !== null ||
    minRaised !== null ||
    maxRaised !== null;

  if (isLoadingCount || isLoadingCampaigns) {
    return <div className="p-6">Loading campaigns…</div>;
  }

  if (countError) {
    return <div className="p-6 text-red-400">Error: {getErrorMessage(countError)}</div>;
  }

  if (campaignsError) {
    return (
      <div className="p-6 text-red-400">Error: {getErrorMessage(campaignsError)}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-purple-500/14 via-white/6 to-black/25 p-6">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-purple-500/22 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-fuchsia-500/12 blur-3xl" />

        <h1 className="text-2xl font-bold">Campaigns</h1>
        <p className="mt-1 text-white/60">Full list with clean filters.</p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 md:col-span-4">
            <div className="text-xs text-white/50">Search</div>
            <input
              value={query}
              onChange={(event) => setParam("q", event.target.value)}
              placeholder="title or description..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-white/35"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 md:col-span-3">
            <div className="text-xs text-white/50">Goal (ETH)</div>
            <div className="flex gap-2">
              <input
                value={minGoal ?? ""}
                onChange={(event) => setParam("minGoal", event.target.value)}
                placeholder="min"
                className="w-1/2 bg-transparent text-sm outline-none placeholder:text-white/35"
              />
              <input
                value={maxGoal ?? ""}
                onChange={(event) => setParam("maxGoal", event.target.value)}
                placeholder="max"
                className="w-1/2 bg-transparent text-sm outline-none placeholder:text-white/35"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 md:col-span-3">
            <div className="text-xs text-white/50">Raised (ETH)</div>
            <div className="flex gap-2">
              <input
                value={minRaised ?? ""}
                onChange={(event) => setParam("minRaised", event.target.value)}
                placeholder="min"
                className="w-1/2 bg-transparent text-sm outline-none placeholder:text-white/35"
              />
              <input
                value={maxRaised ?? ""}
                onChange={(event) => setParam("maxRaised", event.target.value)}
                placeholder="max"
                className="w-1/2 bg-transparent text-sm outline-none placeholder:text-white/35"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 md:col-span-2">
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={onlyApproved}
                onChange={(event) => setParam("approved", event.target.checked ? "1" : "")}
              />
              Approved
            </label>

            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={hasMedia}
                onChange={(event) => setParam("media", event.target.checked ? "1" : "")}
              />
              Media
            </label>

            {hasAnyFilter ? (
              <button
                type="button"
                onClick={clearAll}
                className="ml-auto inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="text-sm text-white/60">
        Showing <span className="text-white/80">{filtered.length}</span> campaign(s).
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-white/60">No campaigns match your filters.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ id, c }) => (
            <CampaignCard key={id} id={id} camp={c} />
          ))}
        </div>
      )}
    </div>
  );
}