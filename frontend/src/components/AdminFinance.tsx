// frontend/src/components/AdminFinance.tsx
import { useReadContract, useReadContracts } from "wagmi";
import type { Abi } from "abitype";
import { formatUnits } from "viem";
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
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="text-sm text-white/60">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-xs text-white/40 mt-1">{hint}</div>}
    </div>
  );
}

export default function AdminFinance() {
  // 1) total campaigns
  const { data: nextIdData, isLoading: l1, error: e1 } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
    query: { refetchInterval: 2000 },
  });

  const nextId = Number(nextIdData ?? 0);

  // 2) multicall getCampaign(0..n-1)
  const calls =
    nextId > 0
      ? Array.from({ length: nextId }, (_, id) => ({
          address: CROWDFUND_ADDRESS,
          abi: CROWDFUND_ABI as unknown as Abi,
          functionName: "getCampaign" as const,
          args: [BigInt(id)],
        }))
      : [];

  const { data: res, isLoading: l2 } = useReadContracts({
    contracts: calls,
    allowFailure: true,
    query: { refetchInterval: 2000 },
  });

  const campaigns: { id: number; c: Campaign }[] =
    (res
      ?.map((r, id) => {
        if (r.status !== "success") return null;
        const c = r.result as unknown as Campaign;
        if (!c?.exists) return null;
        return { id, c };
      })
      .filter(Boolean) as { id: number; c: Campaign }[]) ?? [];

  if (l1 || l2) return <div className="p-6">Loading finance…</div>;
  if (e1) return <div className="p-6 text-red-400">Error: {String(e1)}</div>;

  // --- metrics ---
  const totalRaisedWei = campaigns.reduce((acc, x) => acc + x.c.totalRaised, 0n);
  const totalRaisedEth = Number(formatUnits(totalRaisedWei, 18));

  // withdrawn: quando withdrawn = true, consideramos que o valor totalRaised já saiu (proxy acadêmico)
  const totalWithdrawnWei = campaigns.reduce((acc, x) => {
    return x.c.withdrawn ? acc + x.c.totalRaised : acc;
  }, 0n);
  const totalWithdrawnEth = Number(formatUnits(totalWithdrawnWei, 18));

  // locked: totalRaised - withdrawn
  const lockedWei = totalRaisedWei - totalWithdrawnWei;
  const lockedEth = Number(formatUnits(lockedWei < 0n ? 0n : lockedWei, 18));

  const activeLocked = campaigns.filter((x) => x.c.totalRaised > 0n && !x.c.withdrawn).length;
  const withdrawnCount = campaigns.filter((x) => x.c.withdrawn).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Financial Panel</h2>
        <p className="text-sm text-white/60">
          High-level ETH inflow/outflow tracking derived from on-chain campaign data.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total ETH raised" value={`${totalRaisedEth.toFixed(4)} ETH`} />
        <StatCard
          label="Total ETH withdrawn"
          value={`${totalWithdrawnEth.toFixed(4)} ETH`}
          hint="Proxy: sum(totalRaised) where withdrawn=true"
        />
        <StatCard
          label="Active locked ETH"
          value={`${lockedEth.toFixed(4)} ETH`}
          hint={`Active locked campaigns: ${activeLocked} · Withdrawn campaigns: ${withdrawnCount}`}
        />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="text-sm text-white/60 mb-2">Campaign breakdown</div>
        <table className="w-full text-sm border-separate border-spacing-y-2">
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
            {campaigns.map(({ id, c }) => {
              const raised = Number(formatUnits(c.totalRaised, 18));
              const isWithdrawn = !!c.withdrawn;
              const locked = isWithdrawn ? 0 : raised;

              return (
                <tr key={id} className="bg-white/5">
                  <td className="p-3 rounded-l-xl">#{id}</td>
                  <td className="p-3">{c.title}</td>
                  <td className="p-3">{raised.toFixed(4)} ETH</td>
                  <td className="p-3">
                    {isWithdrawn ? (
                      <span className="text-green-300">Yes</span>
                    ) : (
                      <span className="text-white/50">No</span>
                    )}
                  </td>
                  <td className="p-3 rounded-r-xl">{locked.toFixed(4)} ETH</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
