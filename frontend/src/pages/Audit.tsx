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

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-purple-500/10 via-white/5 to-black/20 p-4">
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-purple-500/20 blur-3xl" />
      <div className="text-sm text-white/60">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-xs text-white/50 mt-1">{sub}</div>}
    </div>
  );
}

export default function Audit() {
  const { data: nextIdData, isLoading: l1, error: e1 } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
    query: { refetchInterval: 2500 },
  });

  const nextId = Number((nextIdData as bigint | undefined) ?? 0n);

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
    query: { refetchInterval: 2500 },
  });

  const campaigns: { id: number; c: Campaign }[] =
    (res
      ?.map((r, id) => {
        if (!r || r.status !== "success") return null;
        const c = r.result as unknown as Campaign;
        if (!c?.exists) return null;
        return { id, c };
      })
      .filter(Boolean) as { id: number; c: Campaign }[]) ?? [];

  if (l1 || l2) return <div className="p-6">Loading stats…</div>;
  if (e1) return <div className="p-6 text-red-400">Error: {String(e1)}</div>;

  const totalCampaigns = campaigns.length;

  const totalRaisedWei = campaigns.reduce((acc, x) => acc + x.c.totalRaised, 0n);
  const totalRaisedEth = Number(formatUnits(totalRaisedWei, 18));

  const nowMs = Date.now();
  const successful = campaigns.filter((x) => x.c.totalRaised >= x.c.goal).length;

  const failed = campaigns.filter(
    (x) => x.c.totalRaised < x.c.goal && Number(x.c.deadline) * 1000 < nowMs
  ).length;

  const successRate =
    totalCampaigns > 0 ? ((successful / totalCampaigns) * 100).toFixed(1) : "0.0";

  function exportCSV() {
    const header = [
      "CampaignID",
      "Title",
      "GoalETH",
      "RaisedETH",
      "Status",
      "Reports",
      "Approved",
      "Held",
      "Withdrawn",
    ].join(",");

    const lines = campaigns.map(({ id, c }) => {
      const raised = Number(formatUnits(c.totalRaised, 18));
      const goal = Number(formatUnits(c.goal, 18));

      const status =
        c.totalRaised >= c.goal
          ? "Successful"
          : Number(c.deadline) * 1000 < nowMs
          ? "Failed"
          : "Ongoing";

      const safeTitle = `"${String(c.title ?? "").split('"').join('""')}"`;

      return [
        id,
        safeTitle,
        goal.toFixed(6),
        raised.toFixed(6),
        status,
        Number(c.reports ?? 0n),
        c.approved ? "true" : "false",
        c.held ? "true" : "false",
        c.withdrawn ? "true" : "false",
      ].join(",");
    });

    const csv = [header, ...lines].join("\n");
    downloadText("blockfund_audit_export.csv", csv);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Platform Statistics</h1>
        <button
          onClick={exportCSV}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
        >
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total campaigns" value={String(totalCampaigns)} />
        <StatCard label="Total funds raised" value={`${totalRaisedEth.toFixed(4)} ETH`} />
        <StatCard label="Success rate" value={`${successRate}%`} sub={`${successful} successful · ${failed} failed`} />
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="pointer-events-none absolute -top-28 -right-28 h-72 w-72 rounded-full bg-purple-500/15 blur-3xl" />
        <h2 className="text-lg font-semibold mb-2">Recent campaigns</h2>

        {!campaigns.length ? (
          <div className="text-white/60 text-sm">No campaigns yet.</div>
        ) : (
          <table className="w-full text-sm border-separate border-spacing-y-2">
            <thead>
              <tr className="text-white/60">
                <th className="text-left">#</th>
                <th className="text-left">Title</th>
                <th className="text-left">Raised / Goal</th>
                <th className="text-left">Status</th>
                <th className="text-left">Reports</th>
                <th className="text-left">Flags</th>
              </tr>
            </thead>

            <tbody>
              {campaigns.map(({ id, c }) => {
                const raised = Number(formatUnits(c.totalRaised, 18));
                const goal = Number(formatUnits(c.goal, 18));

                const status =
                  c.totalRaised >= c.goal
                    ? "Successful"
                    : Number(c.deadline) * 1000 < nowMs
                    ? "Failed"
                    : "Ongoing";

                return (
                  <tr key={id} className="bg-white/5">
                    <td className="p-3 rounded-l-xl">#{id}</td>
                    <td className="p-3">{c.title}</td>
                    <td className="p-3">
                      {raised.toFixed(4)} / {goal.toFixed(4)} ETH
                    </td>
                    <td className="p-3">{status}</td>
                    <td className="p-3">{Number(c.reports ?? 0n)}</td>
                    <td className="p-3 rounded-r-xl">
                      {c.approved ? (
                        <span className="text-green-300">Approved</span>
                      ) : (
                        <span className="text-yellow-300">Pending</span>
                      )}
                      {c.held && <span className="text-yellow-300"> · Held</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="text-sm text-white/60 mt-4">
          Public mock API: <span className="text-white/80">/api/audit.json</span>
        </div>
      </div>
    </div>
  );
}