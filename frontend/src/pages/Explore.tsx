import { useReadContract, useReadContracts } from "wagmi";
import type { Abi } from "viem";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "../lib/contract";
import CampaignCard from "../components/CampaignCard";

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

export default function Explore() {
  const { data: nextIdData, isLoading: l1, error: e1 } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
  });

  const nextId = Number(nextIdData ?? 0);

  const contracts =
    nextId > 0
      ? Array.from({ length: nextId }, (_, id) => ({
          address: CROWDFUND_ADDRESS,
          abi: CROWDFUND_ABI as unknown as Abi,
          functionName: "getCampaign" as const,
          args: [BigInt(id)],
        }))
      : [];

  const { data: res, isLoading: l2 } = useReadContracts({
    contracts,
    allowFailure: true,
  });

  const items =
    res
      ?.map((r, id) => {
        if (r.status !== "success") return null;
        const c = r.result as unknown as Campaign;
        if (!c?.exists) return null;
        return { id, c };
      })
      .filter(Boolean) ?? [];

  if (l1 || l2) return <div className="p-6">Loading campaigns…</div>;
  if (e1) return <div className="p-6 text-red-400">Error: {String(e1)}</div>;
  if (!items.length) return <div className="p-6">No campaigns yet.</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((it) => {
        const { id, c } = it as { id: number; c: Campaign };
        return <CampaignCard key={id} id={id} camp={c} />;
      })}
    </div>
  );
}
