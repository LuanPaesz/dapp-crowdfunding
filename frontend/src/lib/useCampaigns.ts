import { useReadContract, useReadContracts } from "wagmi";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "./contract";
import type { Abi } from "abitype";

export type CampaignData = {
  id: number;
  owner: `0x${string}`;
  title: string;
  description: string;
  goal: bigint;
  deadline: bigint;
  totalRaised: bigint;
  withdrawn: boolean;
  exists: boolean;
};

export function useCampaigns() {
  // 1. pega contador global
  const {
    data: nextIdRaw,
    isLoading: loadingCount,
    error: countError,
  } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
  });

  const nextId = Number(nextIdRaw ?? 0n);

  // 2. se não tem campanha, devolve vazio
  if (nextId === 0) {
    return {
      campaigns: [] as CampaignData[],
      isLoading: loadingCount,
      error: countError,
    };
  }

  // 3. monta as chamadas getCampaign(id) para cada id
  const calls = Array.from({ length: nextId }, (_, id) => ({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI as unknown as Abi,
    functionName: "getCampaign" as const,
    args: [BigInt(id)],
  }));

  // 4. chama multicall
  const {
    data: results,
    isLoading: loadingCampaigns,
    error: campaignsError,
  } = useReadContracts({
    contracts: calls,
    allowFailure: true,
  });

  // 5. converte o resultado bruto em uma lista de campanhas válidas
  const campaigns: CampaignData[] =
    results
      ?.map((callResult, idx) => {
        if (callResult.status !== "success") return null;

        const c = callResult.result as any;
        if (!c || !c.exists) return null;

        return {
          id: idx,
          owner: c.owner,
          title: c.title,
          description: c.description,
          goal: c.goal,
          deadline: c.deadline,
          totalRaised: c.totalRaised,
          withdrawn: c.withdrawn,
          exists: c.exists,
        } satisfies CampaignData;
      })
      .filter(Boolean) as CampaignData[] ?? [];

  return {
    campaigns,
    isLoading: loadingCount || loadingCampaigns,
    error: countError || campaignsError,
  };
}
