import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useReadContract, useReadContracts } from "wagmi";
import type { Abi } from "abitype";
import { ArrowRight, BookOpen, Workflow, Sparkles } from "lucide-react";
import { formatUnits } from "viem";

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

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="relative overflow-hidden flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-white/7 to-black/25 px-4 py-3">
      <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-purple-500/18 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-fuchsia-500/10 blur-2xl" />
      <div className="text-xs text-white/55">{label}</div>
      <div className="text-sm font-semibold text-white/90">{value}</div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
      {children}
    </span>
  );
}

function ClickCard({
  to,
  icon,
  title,
  desc,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-purple-500/10 via-white/5 to-black/25 p-6 transition hover:border-purple-500/30 hover:bg-white/7"
    >
      {/* Always-on glow (igual estilo da imagem 3) */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-purple-500/22 blur-3xl opacity-90" />
      <div className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-fuchsia-500/14 blur-3xl opacity-75" />

      {/* Hover boost */}
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-purple-500/25 blur-3xl" />
      </div>

      <div className="flex items-start justify-between gap-4 relative">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl border border-purple-500/30 bg-purple-500/15 flex items-center justify-center text-purple-200 shadow-[0_0_28px_rgba(139,92,246,0.22)]">
            {icon}
          </div>
          <div>
            <div className="text-base font-semibold">{title}</div>
            <div className="text-sm text-white/65 mt-1 max-w-[560px] leading-relaxed">
              {desc}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs text-white/50 group-hover:text-white/70 transition">
            Open
          </span>
          <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-white/80 transition" />
        </div>
      </div>
    </Link>
  );
}

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

  const approvedItems = rawItems.filter((it) => it.c.approved);

  const nowSec = Math.floor(Date.now() / 1000);
  const liveNow = approvedItems.filter(
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

  const preview = filtered.slice(0, 6);

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

  // KPIs
  const totalCampaigns = approvedItems.length;
  const totalRaisedWei = approvedItems.reduce((acc, x) => acc + x.c.totalRaised, 0n);
  const totalRaisedEth = Number(formatUnits(totalRaisedWei, 18));
  const successful = approvedItems.filter((x) => x.c.totalRaised >= x.c.goal).length;
  const successRate =
    totalCampaigns > 0 ? ((successful / totalCampaigns) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-8">
      {/* HERO (mais vida) */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-purple-500/10 via-white/6 to-black/25 p-6">
        <div className="pointer-events-none absolute -top-28 -left-24 h-72 w-72 rounded-full bg-purple-500/22 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-fuchsia-500/14 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-35 [background:radial-gradient(circle_at_20%_10%,rgba(139,92,246,0.20),transparent_45%),radial-gradient(circle_at_80%_90%,rgba(217,70,239,0.14),transparent_45%)]" />

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 relative">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Pill>
                <Sparkles className="w-3.5 h-3.5" />
                On-chain transparency
              </Pill>
              <Pill>Auditing</Pill>
              <Pill>Milestones</Pill>
              <Pill>Admin approval</Pill>
            </div>

            <h1 className="text-2xl md:text-4xl font-bold leading-tight">
              How crowdfunding works and why blockchain helps
            </h1>

            <p className="text-white/75 mt-3 text-sm md:text-base">
              BlockFund records contributions and key events on-chain, reducing reliance on
              centralized intermediaries. Donors can verify funding progress publicly, while creators
              build trust through transparent activity.
            </p>

            <div className="mt-4 text-xs text-white/55">
              Showing <span className="text-white/80">{filtered.length}</span> campaign(s) —{" "}
              <span className="text-white/80">{liveNow}</span> currently LIVE.
              {!!query && (
                <>
                  {" "}
                  Filter: <span className="text-white/80">"{query}"</span>
                </>
              )}
            </div>
          </div>

          {/* Cofounder */}
          <div className="w-full lg:w-[340px] rounded-3xl border border-white/10 bg-gradient-to-b from-purple-500/12 via-white/5 to-black/25 p-5 relative overflow-hidden">
            <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-purple-500/22 blur-3xl" />
            <div className="text-sm font-semibold">Cofounder</div>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <span className="text-purple-200 font-bold">L</span>
              </div>
              <div>
                <div className="text-sm font-semibold">Luan Paes</div>
                <div className="text-xs text-white/60">Blockchain / Full-stack Developer</div>
              </div>
            </div>
            <div className="text-xs text-white/60 mt-4">
              Academic project with external user testing and public auditability features.
            </div>
          </div>
        </div>

        {/* KPI BAR */}
        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Chip label="Total campaigns" value={String(totalCampaigns)} />
          <Chip label="Live now" value={String(liveNow)} />
          <Chip label="Total raised" value={`${totalRaisedEth.toFixed(4)} ETH`} />
          <Chip label="Success rate" value={`${successRate}%`} />
        </div>
      </section>

      {/* CAMPAIGNS PREVIEW (faltava o texto aqui) */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/6 to-black/25 p-6">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-purple-500/14 blur-3xl" />

        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">Live campaigns</h2>
            <p className="text-sm text-white/60">
              Preview of the latest approved campaigns (max 6). Use the Campaigns page for the full
              list and filters.
            </p>
          </div>

          <Link
            to={query ? `/campaigns?q=${encodeURIComponent(query)}` : "/campaigns"}
            className="text-sm inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 transition"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="mt-4">
          {!preview.length ? (
            <p className="text-white/60">No campaigns found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {preview.map(({ id, c }) => (
                <CampaignCard key={id} id={id} camp={c} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Tutorials + Diagrams cards (com vida) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ClickCard
          to="/tutorials"
          icon={<BookOpen className="w-5 h-5" />}
          title="Tutorials / Get started"
          desc="Wallet setup + add network (RPC), get test ETH from a faucet, create a campaign, and donate — step-by-step for testers."
        />
        <ClickCard
          to="/diagrams"
          icon={<Workflow className="w-5 h-5" />}
          title="System diagrams"
          desc="High-level component architecture + donation sequence flow. Open to see the diagrams and a clear explanation."
        />
      </section>

      {/* Mission/Vision/Values (final) */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-purple-500/10 via-white/5 to-black/25 p-6">
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-purple-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-24 h-72 w-72 rounded-full bg-fuchsia-500/15 blur-3xl" />

        <h2 className="text-lg font-semibold">Explore campaigns</h2>
        <p className="text-white/70 mt-2 max-w-2xl">
          BlockFund is a transparent crowdfunding platform powered by blockchain. Backers support
          campaigns with on-chain contributions, while creators build trust through verifiable
          progress and auditing features.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
          <div className="rounded-2xl border border-purple-500/20 bg-white/5 p-4">
            <div className="text-xs text-purple-200/80">Mission</div>
            <div className="mt-1 text-sm text-white/80">
              Enable transparent fundraising with on-chain accountability.
            </div>
          </div>
          <div className="rounded-2xl border border-purple-500/20 bg-white/5 p-4">
            <div className="text-xs text-purple-200/80">Vision</div>
            <div className="mt-1 text-sm text-white/80">
              Make crowdfunding safer, auditable, and globally accessible.
            </div>
          </div>
          <div className="rounded-2xl border border-purple-500/20 bg-white/5 p-4">
            <div className="text-xs text-purple-200/80">Values</div>
            <div className="mt-1 text-sm text-white/80">
              Transparency • Trust • Community • Security
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}