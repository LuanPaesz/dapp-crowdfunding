import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "./contract";

export type UICampaign = {
  id: bigint;
  owner: string;
  title: string;
  description: string;
  goal: bigint;
  deadline: bigint;
  totalRaised: bigint;
  withdrawn: boolean;
  exists: boolean;
};

export function useCampaigns() {
  // lê o contador
  const { data: nextId } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
    query: { refetchInterval: 1500 },
  }) as { data?: bigint };

  const ids = useMemo(
    () => Array.from({ length: Number(nextId ?? 0n) }, (_, i) => BigInt(i)),
    [nextId]
  );

  // lê todas as campanhas em lote
  const { data: results, isLoading } = useReadContracts({
    allowFailure: true,
    contracts: ids.map((id) => ({
      address: CROWDFUND_ADDRESS,
      abi: CROWDFUND_ABI,
      functionName: "getCampaign",
      args: [id],
    })),
    // revalida periodicamente
    query: { refetchInterval: 2000 },
  });

  const campaigns: UICampaign[] = useMemo(() => {
    if (!results) return [];
    return results
      .map((r, i) => ({ r, id: ids[i] }))
      .filter(({ r }) => r && r.status === "success" && Array.isArray(r.result))
      .map(({ r, id }) => {
        const arr = r!.result as readonly unknown[];
        return {
          id,
          owner: arr[0] as string,
          title: arr[1] as string,
          description: arr[2] as string,
          goal: arr[3] as bigint,
          deadline: arr[4] as bigint,
          totalRaised: arr[5] as bigint,
          withdrawn: arr[6] as boolean,
          exists: arr[7] as boolean,
        };
      });
  }, [results, ids]);

  return { campaigns, isLoading, count: ids.length };
}
