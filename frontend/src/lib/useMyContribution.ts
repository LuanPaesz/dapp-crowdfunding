import { useAccount, useReadContract } from "wagmi";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "./contract";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export function useMyContribution(id: number) {
  const { address } = useAccount();

  const contributorAddress = address ?? ZERO_ADDRESS;

  const { data } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "contributions",
    args: [BigInt(id), contributorAddress],
    query: { enabled: Boolean(address) },
  });

  return (data as bigint | undefined) ?? 0n;
}