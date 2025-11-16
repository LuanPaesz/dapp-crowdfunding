import { useReadContract, useReadContracts } from "wagmi";
import type { Abi } from "abitype";
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
  // optional: present if you added admin approval/media on-chain
  approved?: boolean;
  media?: string;
};

export default function Explore() {
  // read total number of campaigns with light polling for live refresh
  const {
    data: nextIdData,
    isLoading: l1,
    error: e1,
  } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
    // keep UI in sync while developing locally
    query: { refetchInterval: 1500 },
  });

  const nextId = Number(nextIdData ?? 0);

  // build multicall list [ getCampaign(0..nextId-1) ]
  const contracts =
    nextId > 0
      ? Array.from({ length: nextId }, (_, id) => ({
          address: CROWDFUND_ADDRESS,
          abi: CROWDFUND_ABI as unknown as Abi,
          functionName: "getCampaign" as const,
          args: [BigInt(id)],
        }))
      : [];

  // batch read all campaigns with failure-tolerance + polling
  const {
    data: res,
    isLoading: l2,
    error: e2,
  } = useReadContracts({
    contracts,
    allowFailure: true,
    query: { refetchInterval: 1500 },
  });

  // map successful results, ignore non-existing ones
  const rawItems =
    res
      ?.map((r, id) => {
        if (r.status !== "success") return null;
        const c = r.result as unknown as Campaign;
        if (!c?.exists) return null;
        return { id, c };
      })
      .filter(Boolean) ?? [];

  // optional: only show approved campaigns if the field exists
  const items = rawItems.filter((it) => {
    const c = (it as { id: number; c: Campaign }).c;
    return typeof c.approved === "boolean" ? c.approved : true;
  }) as { id: number; c: Campaign }[];

  // loading & error states
  if (l1 || l2) return <div className="p-6">Loading campaigns…</div>;
  if (e1) return <div className="p-6 text-red-400">Error (nextId): {String((e1 as any)?.message ?? e1)}</div>;
  if (e2) return <div className="p-6 text-red-400">Error (campaigns): {String((e2 as any)?.message ?? e2)}</div>;
  if (!items.length) return <div className="p-6">No campaigns yet.</div>;

  return (
    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(({ id, c }) => (
        <CampaignCard key={id} id={id} camp={c} />
      ))}
    </div>
  );
}
