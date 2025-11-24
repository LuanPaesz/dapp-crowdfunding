// frontend/src/pages/MyContributions.tsx

import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { CROWDFUND_ADDRESS, CROWDFUND_ABI as RAW_ABI } from "../lib/contract";
import type { Abi } from "viem";
import { formatEther } from "viem";
import { useNavigate } from "react-router-dom";

// ABI tipado corretamente
const CROWDFUND_ABI: Abi = RAW_ABI as Abi;

export default function MyContributions() {
  const navigate = useNavigate();
  const { address } = useAccount();

  if (!address) return <p className="text-white/70">Connect your wallet.</p>;

  // ---- read total number of campaigns ----
  const { data: nextId } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
    query: { refetchInterval: 2000 },
  }) as { data?: bigint };

  const count = Number(nextId ?? 0n);

  // ---- build read calls: contributions(campaignId, userAddress) ----
  const calls =
    count > 0
      ? Array.from({ length: count }, (_, id) => ({
          address: CROWDFUND_ADDRESS as `0x${string}`,
          abi: CROWDFUND_ABI,
          functionName: "contributions",
          args: [BigInt(id), address],
        }))
      : [];

  // ---- batch read ----
  const { data } = useReadContracts({
    contracts: calls,
    allowFailure: true,
    query: { refetchInterval: 2000 },
  });

  // ---- map contributions > 0 ----
  const rows =
    data
      ?.map((res, id) => {
        if (!res || res.status !== "success") return null;
        const contributed = res.result as bigint;
        if (contributed <= 0n) return null;
        return { id, contributed };
      })
      .filter(Boolean) ?? [];

  if (!rows.length)
    return <p className="text-white/60">You haven't contributed to any campaigns yet.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Contributions</h1>

      <table className="w-full text-sm border-separate border-spacing-y-2">
        <thead>
          <tr className="text-white/60">
            <th className="text-left">Campaign</th>
            <th className="text-left">Amount</th>
            <th className="text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => {
            if (!row) return null;
            const eth = Number(formatEther(row.contributed)).toFixed(5);

            return (
              <tr
                key={row.id}
                className="bg-white/5 hover:bg-white/10 transition cursor-pointer"
              >
                <td className="p-3 rounded-l-xl">#{row.id}</td>
                <td className="p-3">{eth} ETH</td>
                <td className="p-3 rounded-r-xl">
                  <button
                    onClick={() => navigate(`/campaign/${row.id}`)}
                    className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-700 text-xs"
                  >
                    View campaign
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
