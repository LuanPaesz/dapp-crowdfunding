// frontend/src/pages/AdminFinance.tsx
import { Link } from "react-router-dom";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
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
      .map((r, id) => (r.status === "success" ? { id, c: r.result as Campaign } : null))
      .filter(Boolean) as { id: number; c: Campaign }[];

  const totalRaisedWei = rows.reduce((acc, x) => acc + (x.c.totalRaised ?? 0n), 0n);
  const totalWithdrawnWei = rows.reduce(
    (acc, x) => acc + (x.c.withdrawn ? x.c.totalRaised : 0n),
    0n
  );
  const lockedWei = totalRaisedWei - totalWithdrawnWei;

  const totalRaisedEth = Number(formatUnits(totalRaisedWei, 18));
  const totalWithdrawnEth = Number(formatUnits(totalWithdrawnWei, 18));
  const lockedEth = Number(formatUnits(lockedWei, 18));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financial Panel</h1>
          <p className="text-white/60 text-sm">
            Platform-level ETH inflow/outflow based on on-chain campaign data.
          </p>
        </div>
        <Link to="/admin" className="text-sm text-white/60 hover:text-white">
          ← Back to Admin
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-sm text-white/60">Total ETH raised (inflow)</div>
          <div className="text-2xl font-semibold mt-1">{totalRaisedEth.toFixed(4)} ETH</div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-sm text-white/60">Total ETH withdrawn (outflow)</div>
          <div className="text-2xl font-semibold mt-1">
            {totalWithdrawnEth.toFixed(4)} ETH
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-sm text-white/60">Active locked ETH</div>
          <div className="text-2xl font-semibold mt-1">{lockedEth.toFixed(4)} ETH</div>
          <div className="text-xs text-white/50 mt-1">
            Locked = raised − withdrawn
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h2 className="text-lg font-semibold">Campaign breakdown</h2>
        <table className="w-full text-sm border-separate border-spacing-y-2 mt-3">
          <thead>
            <tr className="text-white/60">
              <th className="text-left">#</th>
              <th className="text-left">Title</th>
              <th className="text-left">Raised</th>
              <th className="text-left">Withdrawn?</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ id, c }) => {
              const raised = Number(formatUnits(c.totalRaised, 18));
              return (
                <tr key={id} className="bg-black/20">
                  <td className="p-3 rounded-l-xl">#{id}</td>
                  <td className="p-3">{c.title}</td>
                  <td className="p-3">{raised.toFixed(4)} ETH</td>
                  <td className="p-3 rounded-r-xl">
                    {c.withdrawn ? (
                      <span className="text-green-300">Yes</span>
                    ) : (
                      <span className="text-yellow-300">No</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
