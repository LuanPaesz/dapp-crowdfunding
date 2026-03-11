import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import type { Abi } from "abitype";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "./contract";

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

type CampaignContractResult = Omit<CampaignData, "id">;

export function useCampaigns() {
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
  const enabled = nextId > 0;

  const calls = useMemo(() => {
    if (!enabled) {
      return [];
    }

    return Array.from({ length: nextId }, (_, id) => ({
      address: CROWDFUND_ADDRESS,
      abi: CROWDFUND_ABI as Abi,
      functionName: "getCampaign" as const,
      args: [BigInt(id)],
    }));
  }, [enabled, nextId]);

  const {
    data: results,
    isLoading: loadingCampaigns,
    error: campaignsError,
  } = useReadContracts({
    contracts: calls,
    allowFailure: true,
    query: { enabled },
  });

  const campaigns = useMemo<CampaignData[]>(() => {
    return (
      results?.flatMap((callResult, index) => {
        if (callResult?.status !== "success") {
          return [];
        }

        const campaign = callResult.result as CampaignContractResult;

        if (!campaign.exists) {
          return [];
        }

        return [
          {
            id: index,
            owner: campaign.owner,
            title: campaign.title,
            description: campaign.description,
            goal: campaign.goal,
            deadline: campaign.deadline,
            totalRaised: campaign.totalRaised,
            withdrawn: campaign.withdrawn,
            exists: campaign.exists,
          },
        ];
      }) ?? []
    );
  }, [results]);

  return {
    campaigns,
    isLoading: loadingCount || (enabled && loadingCampaigns),
    error: countError ?? campaignsError,
  };
}