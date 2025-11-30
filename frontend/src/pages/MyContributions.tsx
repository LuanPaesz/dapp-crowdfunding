// frontend/src/pages/MyContributions.tsx
import {
  useAccount,
  useReadContract,
  useReadContracts,
} from "wagmi";
import { CROWDFUND_ADDRESS, CROWDFUND_ABI as RAW_ABI } from "../lib/contract";
import type { Abi } from "viem";
import { formatEther, formatUnits } from "viem";
import { useNavigate } from "react-router-dom";

const CROWDFUND_ABI: Abi = RAW_ABI as Abi;

type Campaign = {
  owner: `0x${string}`;
  title: string;
  description: string;
  goal: bigint;
  deadline: bigint;
  totalRaised: bigint;
  withdrawn: boolean;
  exists: boolean;
};

export default function MyContributions() {
  const navigate = useNavigate();
  const { address } = useAccount();

  if (!address)
    return <p className="text-white/70">Connect your wallet.</p>;

  // ---- read total number of campaigns ----
  const { data: nextId } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
    query: { refetchInterval: 2000 },
  }) as { data?: bigint };

  const count = Number(nextId ?? 0n);

  // ---- build read calls ----
  const contribCalls =
    count > 0
      ? Array.from({ length: count }, (_, id) => ({
          address: CROWDFUND_ADDRESS as `0x${string}`,
          abi: CROWDFUND_ABI,
          functionName: "contributions",
          args: [BigInt(id), address],
        }))
      : [];

  const campaignCalls =
    count > 0
      ? Array.from({ length: count }, (_, id) => ({
          address: CROWDFUND_ADDRESS as `0x${string}`,
          abi: CROWDFUND_ABI,
          functionName: "getCampaign",
          args: [BigInt(id)],
        }))
      : [];

  // ---- batch reads ----
  const { data: contribData } = useReadContracts({
    contracts: contribCalls,
    allowFailure: true,
    query: { refetchInterval: 2000 },
  });

  const { data: campaignData } = useReadContracts({
    contracts: campaignCalls,
    allowFailure: true,
    query: { refetchInterval: 4000 },
  });

  // ---- map rows ----
  const rows =
    contribData
      ?.map((res, id) => {
        if (!res || res.status !== "success") return null;
        const contributed = res.result as bigint;
        if (contributed <= 0n) return null;

        const cRes = campaignData?.[id];
        if (!cRes || cRes.status !== "success") return null;

        const camp = cRes.result as Campaign;
        if (!camp.exists) return null;

        return { id, contributed, camp };
      })
      .filter(Boolean) ?? [];

  if (!rows.length)
    return (
      <p className="text-white/60">
        You haven&apos;t contributed to any campaigns yet.
      </p>
    );

  const totalContributed = rows.reduce(
    (acc, r: any) => acc + r.contributed,
    0n
  );
  const totalContributedEth = Number(formatEther(totalContributed));

  const nowMs = Date.now();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">My Contributions</h1>
        <p className="text-xs text-white/50 mt-1">
          Contributions are cumulative: if you contribute multiple times to the
          same campaign, all amounts are added together on-chain.
        </p>
        <p className="text-xs text-white/60 mt-1">
          Total contributed across all campaigns:{" "}
          <span className="font-semibold">
            {totalContributedEth.toFixed(5)} ETH
          </span>
        </p>
      </div>

      <table className="w-full text-sm border-separate border-spacing-y-2">
        <thead>
          <tr className="text-white/60">
            <th className="text-left">Campaign</th>
            <th className="text-left">Status</th>
            <th className="text-left">Amount</th>
            <th className="text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row: any) => {
            const eth = Number(formatEther(row.contributed)).toFixed(5);
            const goalEth = Number(
              formatUnits(row.camp.goal, 18)
            ).toFixed(4);
            const raisedEth = Number(
              formatUnits(row.camp.totalRaised, 18)
            ).toFixed(4);

            const ended =
              Number(row.camp.deadline) * 1000 < nowMs;
            let status = "Ongoing";
            if (row.camp.totalRaised >= row.camp.goal) {
              status = "Successful";
            } else if (ended) {
              status = "Failed";
            }

            return (
              <tr
                key={row.id}
                className="bg-white/5 hover:bg-white/10 transition"
              >
                <td className="p-3 rounded-l-xl">
                  <div className="flex flex-col">
                    <span className="font-semibold">
                      #{row.id} – {row.camp.title}
                    </span>
                    <span className="text-xs text-white/50">
                      Raised {raisedEth} / {goalEth} ETH
                    </span>
                  </div>
                </td>
                <td className="p-3">{status}</td>
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
