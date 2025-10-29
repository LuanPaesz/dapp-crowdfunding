import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { CROWDFUND_ADDRESS } from "../lib/contract";
import { formatEther, Abi } from "viem";
import { CROWDFUND_ABI as RAW_CROWDFUND_ABI } from "../lib/contract";

// Ensure ABI is typed as Abi
const CROWDFUND_ABI: Abi = RAW_CROWDFUND_ABI as Abi;

export default function MyContributions() {
  const { address } = useAccount();
  if (!address) return <p>Connect your wallet.</p>;

  const { data: nextId } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
    query: { refetchInterval: 1500 },
  }) as { data?: bigint };

  const count = Number(nextId ?? 0n);
  const calls = Array.from({ length: count }, (_, i) => ({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "contributions",
    args: [BigInt(i), address as `0x${string}`],
  })) as readonly {
    address: `0x${string}`;
    abi: Abi;
    functionName: string;
    args: readonly unknown[];
  }[];

  const { data } = useReadContracts({
    contracts: calls,
    query: { refetchInterval: 1500 },
  });

  const rows =
    (data ?? [])
      .map((r, i) => {
        const v = (r?.result as bigint) ?? 0n;
        return { id: i, value: v };
      })
      .filter((r) => r.value > 0n) ?? [];

  if (rows.length === 0) return <p className="text-white/60">You haven't contributed yet.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Contributions</h1>
      <table className="w-full text-sm border-separate border-spacing-y-2">
        <thead>
          <tr className="text-white/60">
            <th className="text-left">Campaign</th>
            <th className="text-left">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="bg-white/5">
              <td className="p-3 rounded-l-xl">#{r.id}</td>
              <td className="p-3 rounded-r-xl">{Number(formatEther(r.value)).toFixed(6)} ETH</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
