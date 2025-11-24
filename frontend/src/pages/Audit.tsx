// frontend/src/pages/Audit.tsx
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
  approved?: boolean;
  held: boolean;
  reports: bigint;
};

export default function Audit() {
  const { data: nextIdData, isLoading: l1, error: e1 } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
  });

  const nextId = Number(nextIdData ?? 0);

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
  });

  const campaigns: { id: number; c: Campaign }[] =
    res
      ?.map((r, id) => {
        if (r.status !== "success") return null;
        const c = r.result as unknown as Campaign;
        if (!c?.exists) return null;
        return { id, c };
      })
      .filter(Boolean) as { id: number; c: Campaign }[] ?? [];

  if (l1 || l2) return <div className="p-6">Loading stats…</div>;
  if (e1) return <div className="p-6 text-red-400">Error: {String(e1)}</div>;

  const totalCampaigns = campaigns.length;
  const totalRaisedWei = campaigns.reduce(
    (acc, x) => acc + x.c.totalRaised,
    0n
  );
  const totalRaisedEth = Number(formatUnits(totalRaisedWei, 18));

  const successful = campaigns.filter(
    (x) => x.c.totalRaised >= x.c.goal
  ).length;
  const failed = campaigns.filter(
    (x) =>
      x.c.totalRaised < x.c.goal &&
      Number(x.c.deadline) * 1000 < Date.now()
  ).length;

  const successRate =
    totalCampaigns > 0
      ? ((successful / totalCampaigns) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Platform Statistics</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-sm text-white/60">Total campaigns</div>
          <div className="text-2xl font-semibold mt-1">{totalCampaigns}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-sm text.white/60">Total funds raised</div>
          <div className="text-2xl font-semibold mt-1">
            {totalRaisedEth.toFixed(4)} ETH
          </div>
        </div>
        <div className="bg.white/5 border border-white/10 rounded-xl p-4">
          <div className="text-sm text-white/60">Success rate</div>
          <div className="text-2xl font-semibold mt-1">{successRate}%</div>
          <div className="text-xs text-white/50 mt-1">
            {successful} successful · {failed} failed
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Recent campaigns</h2>
        <table className="w-full text-sm border-separate border-spacing-y-2">
          <thead>
            <tr className="text-white/60">
              <th className="text-left">#</th>
              <th className="text-left">Title</th>
              <th className="text-left">Raised / Goal</th>
              <th className="text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map(({ id, c }) => {
              const raised = Number(formatUnits(c.totalRaised, 18));
              const goal = Number(formatUnits(c.goal, 18));
              const status =
                c.totalRaised >= c.goal
                  ? "Successful"
                  : Number(c.deadline) * 1000 < Date.now()
                  ? "Failed"
                  : "Ongoing";
              return (
                <tr key={id} className="bg-white/5">
                  <td className="p-3 rounded-l-xl">#{id}</td>
                  <td className="p-3">{c.title}</td>
                  <td className="p-3">
                    {raised.toFixed(4)} / {goal.toFixed(4)} ETH
                  </td>
                  <td className="p-3 rounded-r-xl">{status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
