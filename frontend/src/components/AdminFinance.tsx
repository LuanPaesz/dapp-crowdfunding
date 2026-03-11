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

type StatCardProps = Readonly<{
  label: string;
  value: string;
  hint?: string;
}>;

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

function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm text-white/60">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-white/40">{hint}</div> : null}
    </div>
  );
}

export default function AdminFinance() {
  const {
    data: nextIdData,
    isLoading: isLoadingNextId,
    error: nextIdError,
  } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
    query: { refetchInterval: 2000 },
  });

  const nextId = Number(nextIdData ?? 0);

  const calls =
    nextId > 0
      ? Array.from({ length: nextId }, (_, id) => ({
          address: CROWDFUND_ADDRESS,
          abi: CROWDFUND_ABI as Abi,
          functionName: "getCampaign" as const,
          args: [BigInt(id)],
        }))
      : [];

  const { data: results, isLoading: isLoadingCampaigns } = useReadContracts({
    contracts: calls,
    allowFailure: true,
    query: { refetchInterval: 2000 },
  });

  const campaigns: Array<{ id: number; c: Campaign }> =
    results?.flatMap((result, id) => {
      if (result.status !== "success") {
        return [];
      }

      const campaign = result.result as Campaign;

      if (!campaign?.exists) {
        return [];
      }

      return [{ id, c: campaign }];
    }) ?? [];

  if (isLoadingNextId || isLoadingCampaigns) {
    return <div className="p-6">Loading finance…</div>;
  }

  if (nextIdError) {
    return (
      <div className="p-6 text-red-400">
        Error: {getErrorMessage(nextIdError)}
      </div>
    );
  }

  const totalRaisedWei = campaigns.reduce(
    (accumulator, item) => accumulator + item.c.totalRaised,
    0n
  );
  const totalRaisedEth = Number(formatUnits(totalRaisedWei, 18));

  const totalWithdrawnWei = campaigns.reduce((accumulator, item) => {
    return item.c.withdrawn ? accumulator + item.c.totalRaised : accumulator;
  }, 0n);
  const totalWithdrawnEth = Number(formatUnits(totalWithdrawnWei, 18));

  const lockedWei = totalRaisedWei - totalWithdrawnWei;
  const safeLockedWei = lockedWei < 0n ? 0n : lockedWei;
  const lockedEth = Number(formatUnits(safeLockedWei, 18));

  const activeLockedCount = campaigns.filter(
    (item) => item.c.totalRaised > 0n && !item.c.withdrawn
  ).length;

  const withdrawnCount = campaigns.filter((item) => item.c.withdrawn).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Financial Panel</h2>
        <p className="text-sm text-white/60">
          High-level ETH inflow/outflow tracking derived from on-chain campaign
          data.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total ETH raised"
          value={`${totalRaisedEth.toFixed(4)} ETH`}
        />
        <StatCard
          label="Total ETH withdrawn"
          value={`${totalWithdrawnEth.toFixed(4)} ETH`}
          hint="Proxy: sum(totalRaised) where withdrawn=true"
        />
        <StatCard
          label="Active locked ETH"
          value={`${lockedEth.toFixed(4)} ETH`}
          hint={`Active locked campaigns: ${activeLockedCount} · Withdrawn campaigns: ${withdrawnCount}`}
        />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="mb-2 text-sm text-white/60">Campaign breakdown</div>

        <table className="w-full border-separate border-spacing-y-2 text-sm">
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
              const isWithdrawn = c.withdrawn;
              const locked = isWithdrawn ? 0 : raised;

              return (
                <tr key={id} className="bg-white/5">
                  <td className="rounded-l-xl p-3">#{id}</td>
                  <td className="p-3">{c.title}</td>
                  <td className="p-3">{raised.toFixed(4)} ETH</td>
                  <td className="p-3">
                    {isWithdrawn ? (
                      <span className="text-green-300">Yes</span>
                    ) : (
                      <span className="text-white/50">No</span>
                    )}
                  </td>
                  <td className="rounded-r-xl p-3">{locked.toFixed(4)} ETH</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}