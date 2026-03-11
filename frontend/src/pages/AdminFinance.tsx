import { useMemo, type ReactNode } from "react";
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

type StatCardProps = Readonly<{
  label: string;
  value: string;
  sub?: string;
  icon: ReactNode;
  glow?: "purple" | "fuchsia";
}>;

function StatCard({
  label,
  value,
  sub,
  icon,
  glow = "purple",
}: StatCardProps) {
  const glowClass =
    glow === "fuchsia" ? "bg-fuchsia-500/14" : "bg-purple-500/18";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/7 to-black/25 p-4">
      <div
        className={
          "pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl " +
          glowClass
        }
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-white/60">{label}</div>
          <div className="mt-1 text-2xl font-semibold">{value}</div>
          {sub ? <div className="mt-1 text-xs text-white/45">{sub}</div> : null}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-purple-500/25 bg-purple-500/10 text-purple-200">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AdminFinance() {
  const { address } = useAccount();
  const envAdmin = String(import.meta.env.VITE_ADMIN_ADDRESS ?? "").toLowerCase();

  const { data: contractAdmin } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "admin",
  });

  const adminAddress = (contractAdmin as string | undefined)?.toLowerCase();
  const currentAddress = address?.toLowerCase();

  const isAdmin = Boolean(
    currentAddress &&
      (currentAddress === envAdmin || currentAddress === adminAddress)
  );

  const adminEnabled = isAdmin;

  const { data: nextId } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
    query: { enabled: adminEnabled, refetchInterval: 1500 },
  });

  const count = Number((nextId as bigint | undefined) ?? 0n);

  const calls = useMemo(() => {
    if (!adminEnabled || count <= 0) {
      return [];
    }

    return Array.from({ length: count }, (_, id) => ({
      address: CROWDFUND_ADDRESS,
      abi: CROWDFUND_ABI as Abi,
      functionName: "getCampaign" as const,
      args: [BigInt(id)],
    }));
  }, [adminEnabled, count]);

  const { data } = useReadContracts({
    contracts: calls,
    allowFailure: true,
    query: {
      enabled: adminEnabled && calls.length > 0,
      refetchInterval: 1500,
    },
  });

  const rows = useMemo<Array<{ id: number; c: Campaign }>>(() => {
    return (
      data?.flatMap((result, id) => {
        if (result?.status !== "success") {
          return [];
        }

        return [{ id, c: result.result as Campaign }];
      }) ?? []
    );
  }, [data]);

  const totalRaisedWei = rows.reduce(
    (accumulator, row) => accumulator + row.c.totalRaised,
    0n
  );

  const totalWithdrawnWei = rows.reduce((accumulator, row) => {
    return row.c.withdrawn
      ? accumulator + row.c.totalRaised
      : accumulator;
  }, 0n);

  const lockedWei = totalRaisedWei - totalWithdrawnWei;

  const totalRaisedEth = Number(formatUnits(totalRaisedWei, 18));
  const totalWithdrawnEth = Number(formatUnits(totalWithdrawnWei, 18));
  const lockedEth = Number(formatUnits(lockedWei < 0n ? 0n : lockedWei, 18));

  const withdrawnCount = rows.filter((row) => row.c.withdrawn).length;
  const activeLockedCount = rows.length - withdrawnCount;

  const avgRaisedEth = useMemo(() => {
    if (rows.length === 0) {
      return 0;
    }

    return totalRaisedEth / rows.length;
  }, [rows.length, totalRaisedEth]);

  if (!isAdmin) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Financial Panel</h1>
        <p className="text-sm text-red-400">Access denied.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-purple-500/14 via-white/6 to-black/25 p-6">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-purple-500/22 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-24 h-72 w-72 rounded-full bg-fuchsia-500/12 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Financial Panel</h1>
            <p className="text-sm text-white/60">
              High-level ETH inflow/outflow tracking derived from on-chain campaign data.
            </p>
          </div>

          <div className="hidden items-center gap-2 text-xs text-white/55 sm:flex">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5 text-purple-200" />
              Admin view
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total ETH raised"
          value={`${totalRaisedEth.toFixed(4)} ETH`}
          sub={`Across ${rows.length} campaign(s) • Avg ${avgRaisedEth.toFixed(4)} ETH`}
          icon={<ArrowUpRight className="h-5 w-5" />}
          glow="purple"
        />

        <StatCard
          label="Total ETH withdrawn"
          value={`${totalWithdrawnEth.toFixed(4)} ETH`}
          sub="Proxy: sum(totalRaised) where withdrawn=true"
          icon={<ArrowDownRight className="h-5 w-5" />}
          glow="fuchsia"
        />

        <StatCard
          label="Active locked ETH"
          value={`${lockedEth.toFixed(4)} ETH`}
          sub={`Active locked campaigns: ${activeLockedCount} • Withdrawn campaigns: ${withdrawnCount}`}
          icon={<Lock className="h-5 w-5" />}
          glow="purple"
        />
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/6 to-black/25 p-5">
        <div className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-purple-500/12 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Campaign breakdown</h2>
            <p className="mt-1 text-sm text-white/60">
              Per-campaign funds state derived from{" "}
              <span className="text-white/80">totalRaised</span> and{" "}
              <span className="text-white/80">withdrawn</span>.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
            <Wallet className="h-3.5 w-3.5 text-purple-200" />
            ETH totals view
          </div>
        </div>

        <table className="mt-4 w-full border-separate border-spacing-y-2 text-sm">
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
              const raised = Number(formatUnits(c.totalRaised, 18));
              const locked = c.withdrawn ? 0 : raised;

              return (
                <tr key={id} className="bg-white/5">
                  <td className="rounded-l-xl p-3">#{id}</td>
                  <td className="p-3">{c.title}</td>
                  <td className="p-3">{raised.toFixed(4)} ETH</td>
                  <td className="p-3">
                    {c.withdrawn ? (
                      <span className="text-green-300">Yes</span>
                    ) : (
                      <span className="text-yellow-300">No</span>
                    )}
                  </td>
                  <td className="rounded-r-xl p-3">
                    <span className="inline-flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-200/80" />
                      {locked.toFixed(4)} ETH
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {rows.length === 0 ? (
          <div className="mt-3 text-sm text-white/60">No campaigns found.</div>
        ) : null}
      </div>
    </div>
  );
}