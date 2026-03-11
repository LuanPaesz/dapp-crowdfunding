import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import type { Abi } from "viem";
import { formatEther, formatUnits } from "viem";
import { CROWDFUND_ADDRESS, CROWDFUND_ABI as RAW_ABI } from "../lib/contract";

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

type ContributionRow = {
  id: number;
  contributed: bigint;
  camp: Campaign;
};

export default function MyContributions() {
  const navigate = useNavigate();
  const { address } = useAccount();

  const hasAddress = Boolean(address);

  const { data: nextId } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
    query: { enabled: hasAddress, refetchInterval: 2000 },
  });

  const count = Number((nextId as bigint | undefined) ?? 0n);

  const contributionCalls = useMemo(() => {
    if (!hasAddress || count <= 0 || !address) {
      return [];
    }

    return Array.from({ length: count }, (_, id) => ({
      address: CROWDFUND_ADDRESS,
      abi: CROWDFUND_ABI,
      functionName: "contributions" as const,
      args: [BigInt(id), address],
    }));
  }, [hasAddress, count, address]);

  const campaignCalls = useMemo(() => {
    if (!hasAddress || count <= 0) {
      return [];
    }

    return Array.from({ length: count }, (_, id) => ({
      address: CROWDFUND_ADDRESS,
      abi: CROWDFUND_ABI,
      functionName: "getCampaign" as const,
      args: [BigInt(id)],
    }));
  }, [hasAddress, count]);

  const { data: contributionData } = useReadContracts({
    contracts: contributionCalls,
    allowFailure: true,
    query: {
      enabled: hasAddress && contributionCalls.length > 0,
      refetchInterval: 2000,
    },
  });

  const { data: campaignData } = useReadContracts({
    contracts: campaignCalls,
    allowFailure: true,
    query: {
      enabled: hasAddress && campaignCalls.length > 0,
      refetchInterval: 4000,
    },
  });

  const rows = useMemo<ContributionRow[]>(() => {
    return (
      contributionData?.flatMap((result, id) => {
        if (result?.status !== "success") {
          return [];
        }

        const contributed = result.result as bigint;

        if (contributed <= 0n) {
          return [];
        }

        const campaignResult = campaignData?.[id];

        if (campaignResult?.status !== "success") {
          return [];
        }

        const campaign = campaignResult.result as Campaign;

        if (!campaign.exists) {
          return [];
        }

        return [{ id, contributed, camp: campaign }];
      }) ?? []
    );
  }, [contributionData, campaignData]);

  if (!address) {
    return <p className="text-white/70">Connect your wallet.</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="text-white/60">
        You haven&apos;t contributed to any campaigns yet.
      </p>
    );
  }

  const totalContributed = rows.reduce(
    (accumulator, row) => accumulator + row.contributed,
    0n
  );
  const totalContributedEth = Number(formatEther(totalContributed));
  const nowInMilliseconds = Date.now();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">My Contributions</h1>
        <p className="mt-1 text-xs text-white/50">
          Contributions are cumulative: if you contribute multiple times to the
          same campaign, all amounts are added together on-chain.
        </p>
        <p className="mt-1 text-xs text-white/60">
          Total contributed across all campaigns:{" "}
          <span className="font-semibold">
            {totalContributedEth.toFixed(5)} ETH
          </span>
        </p>
      </div>

      <table className="w-full border-separate border-spacing-y-2 text-sm">
        <thead>
          <tr className="text-white/60">
            <th className="text-left">Campaign</th>
            <th className="text-left">Status</th>
            <th className="text-left">Amount</th>
            <th className="text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => {
            const contributedEth = Number(formatEther(row.contributed)).toFixed(5);
            const goalEth = Number(formatUnits(row.camp.goal, 18)).toFixed(4);
            const raisedEth = Number(formatUnits(row.camp.totalRaised, 18)).toFixed(4);

            const ended = Number(row.camp.deadline) * 1000 < nowInMilliseconds;

            let status = "Ongoing";
            if (row.camp.totalRaised >= row.camp.goal) {
              status = "Successful";
            } else if (ended) {
              status = "Failed";
            }

            return (
              <tr key={row.id} className="bg-white/5 transition hover:bg-white/10">
                <td className="rounded-l-xl p-3">
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
                <td className="p-3">{contributedEth} ETH</td>
                <td className="rounded-r-xl p-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/campaign/${row.id}`)}
                    className="rounded bg-purple-600 px-3 py-1 text-xs hover:bg-purple-700"
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