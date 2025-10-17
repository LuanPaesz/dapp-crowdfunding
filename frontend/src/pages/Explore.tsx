import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "../lib/contract";
import CampaignCard from "../components/CampaignCard";

export default function Explore() {
  // 1) Lê o contador
  const { data: nextId } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
    query: { refetchInterval: 1500 },
  }) as { data?: bigint };

  const count = Number(nextId ?? 0n);
  const ids = useMemo(
    () => Array.from({ length: count }, (_, i) => BigInt(i)),
    [count]
  );

  // 2) Busca todas as campanhas em lote e permite falhas
  const { data: results, isLoading } = useReadContracts({
    allowFailure: true,
    contracts: ids.map((id) => ({
      address: CROWDFUND_ADDRESS,
      abi: CROWDFUND_ABI,
      functionName: "getCampaign",
      args: [id],
    })),
    query: { refetchInterval: 2000 },
  });

  // 3) Filtra só as que existem (status success e exists == true)
  const visibleIds = useMemo(() => {
    if (!results) return [];
    return results
      .map((r, i) => ({ r, id: ids[i] }))
      .filter(
        ({ r }) =>
          r &&
          r.status === "success" &&
          Array.isArray(r.result) &&
          // struct: [owner, title, desc, goal, deadline, totalRaised, withdrawn, exists]
          (r.result as readonly unknown[])[7] === true
      )
      .map(({ id }) => id);
  }, [results, ids]);

  // 4) Estados de UI
  if (isLoading) return <p className="text-white/60">Loading campaigns…</p>;
  if (count === 0)
    return <p className="text-white/60">No campaigns created yet.</p>;
  if (visibleIds.length === 0)
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Explore Campaigns</h1>
        <p className="text-white/60">
          We found {count} campaign id(s), but none readable right now.
          Check if the frontend contract address matches the latest deploy and
          that you’re on the Hardhat network (31337).
        </p>
      </div>
    );

  // 5) Render
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Explore Campaigns</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleIds.map((id) => (
          <CampaignCard key={String(id)} id={id} />
        ))}
      </div>
    </div>
  );
}
