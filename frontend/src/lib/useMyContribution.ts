import { useAccount, useReadContract } from "wagmi";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "./contract";

export function useMyContribution(id: number) {
  const { address } = useAccount();
  const { data } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "contributions",
    args: [BigInt(id), (address ?? "0x0000000000000000000000000000000000000000") as `0x${string}`],
    query: { enabled: Boolean(address) },
  }) as { data?: bigint };
  return data ?? 0n;
}
