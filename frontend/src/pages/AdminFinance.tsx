import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import type { Abi } from "abitype";
import { formatUnits } from "viem";
import {
  ArrowDownRight,
  ArrowUpRight,
  Lock,
  Wallet,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "../lib/contract";

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
  held: boolean;
  reports: bigint;
};

function StatCard({
  label,
  value,
  sub,
  icon,
  glow = "purple",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  glow?: "purple" | "fuchsia";
}) {
  const glowClass =
    glow === "fuchsia" ? "bg-fuchsia-500/14" : "bg-purple-500/18";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/7 to-black/25 p-4">
      <div
        className={
          "pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full blur-2xl " +
          glowClass
        }
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-white/60">{label}</div>
          <div className="text-2xl font-semibold mt-1">{value}</div>
          {sub ? <div className="text-xs text-white/45 mt-1">{sub}</div> : null}
        </div>
        <div className="h-10 w-10 rounded-2xl border border-purple-500/25 bg-purple-500/10 flex items-center justify-center text-purple-200">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AdminFinance() {
  const { address } = useAccount();
  const envAdmin = import.meta.env.VITE_ADMIN_ADDRESS?.toLowerCase() ?? null;

  const { data: contractAdmin } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "admin",
  }) as { data?: string };

  const isAdmin =
    !!address &&
    (address.toLowerCase() === envAdmin ||
      address.toLowerCase() === contractAdmin?.toLowerCase());

  if (!isAdmin) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Financial Panel</h1>
        <p className="text-red-400 text-sm">Access denied.</p>
      </div>
    );
  }

  const { data: nextId } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
    query: { refetchInterval: 1500 },
  }) as { data?: bigint };

  const count = Number(nextId ?? 0n);

  const calls =
    count > 0
      ? Array.from({ length: count }, (_, id) => ({
          address: CROWDFUND_ADDRESS,
          abi: CROWDFUND_ABI as unknown as Abi,
          functionName: "getCampaign" as const,
          args: [BigInt(id)],
        }))
      : [];

  const { data } = useReadContracts({
    contracts: calls,
    allowFailure: true,
    query: { refetchInterval: 1500 },
  });

  const rows =
    (data ?? [])
      .map((r, id) =>
        r?.status === "success" ? { id, c: r.result as Campaign } : null
      )
      .filter(Boolean) as { id: number; c: Campaign }[];

  // ✅ Totals
  const totalRaisedWei = rows.reduce(
    (acc, x) => acc + (x.c.totalRaised ?? 0n),
    0n
  );
  const totalWithdrawnWei = rows.reduce(
    (acc, x) => acc + (x.c.withdrawn ? x.c.totalRaised : 0n),
    0n
  );
  const lockedWei = totalRaisedWei - totalWithdrawnWei;

  const totalRaisedEth = Number(formatUnits(totalRaisedWei, 18));
  const totalWithdrawnEth = Number(formatUnits(totalWithdrawnWei, 18));
  const lockedEth = Number(formatUnits(lockedWei, 18));

  const withdrawnCount = rows.filter((x) => x.c.withdrawn).length;
  const activeLockedCount = rows.length - withdrawnCount;

  // Optional mini metrics
  const avgRaisedEth = useMemo(() => {
    if (!rows.length) return 0;
    return totalRaisedEth / rows.length;
  }, [rows.length, totalRaisedEth]);

  return (
    <div className="space-y-6">
      {/* Header (more life) */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-purple-500/14 via-white/6 to-black/25 p-6">
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-purple-500/22 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-24 h-72 w-72 rounded-full bg-fuchsia-500/12 blur-3xl" />

        <div className="flex items-start justify-between gap-4 flex-wrap relative">
          <div>
            <h1 className="text-2xl font-bold">Financial Panel</h1>
            <p className="text-white/60 text-sm">
              High-level ETH inflow/outflow tracking derived from on-chain campaign data.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-white/55">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-200" />
              Admin view
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards (with purple/fuchsia glow) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total ETH raised"
          value={`${totalRaisedEth.toFixed(4)} ETH`}
          sub={`Across ${rows.length} campaign(s) • Avg ${avgRaisedEth.toFixed(4)} ETH`}
          icon={<ArrowUpRight className="w-5 h-5" />}
          glow="purple"
        />

        <StatCard
          label="Total ETH withdrawn"
          value={`${totalWithdrawnEth.toFixed(4)} ETH`}
          sub="Proxy: sum(totalRaised) where withdrawn=true"
          icon={<ArrowDownRight className="w-5 h-5" />}
          glow="fuchsia"
        />

        <StatCard
          label="Active locked ETH"
          value={`${lockedEth.toFixed(4)} ETH`}
          sub={`Active locked campaigns: ${activeLockedCount} • Withdrawn campaigns: ${withdrawnCount}`}
          icon={<Lock className="w-5 h-5" />}
          glow="purple"
        />
      </div>

      {/* Breakdown table (more life + subtle glow) */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/6 to-black/25 p-5">
        <div className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-purple-500/12 blur-3xl" />
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">Campaign breakdown</h2>
            <p className="text-sm text-white/60 mt-1">
              Per-campaign funds state derived from <span className="text-white/80">totalRaised</span>{" "}
              and <span className="text-white/80">withdrawn</span>.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
            <Wallet className="w-3.5 h-3.5 text-purple-200" />
            ETH totals view
          </div>
        </div>

        <table className="w-full text-sm border-separate border-spacing-y-2 mt-4">
          <thead>
            <tr className="text-white/60">
              <th className="text-left">#</th>
              <th className="text-left">Title</th>
              <th className="text-left">Raised</th>
              <th className="text-left">Withdrawn</th>
              <th className="text-left">Locked</th>
            </tr>
          </thead>

          <tbody>
            {rows.map(({ id, c }) => {
              const raised = Number(formatUnits(c.totalRaised ?? 0n, 18));
              const locked = c.withdrawn ? 0 : raised;

              return (
                <tr key={id} className="bg-white/5">
                  <td className="p-3 rounded-l-xl">#{id}</td>
                  <td className="p-3">{c.title}</td>
                  <td className="p-3">{raised.toFixed(4)} ETH</td>

                  <td className="p-3">
                    {c.withdrawn ? (
                      <span className="text-green-300">Yes</span>
                    ) : (
                      <span className="text-yellow-300">No</span>
                    )}
                  </td>

                  <td className="p-3 rounded-r-xl">
                    <span className="inline-flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-200/80" />
                      {locked.toFixed(4)} ETH
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!rows.length ? (
          <div className="text-sm text-white/60 mt-3">No campaigns found.</div>
        ) : null}
      </div>
    </div>
  );
}