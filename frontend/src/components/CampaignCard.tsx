import { useEffect, useMemo, useState } from "react";
import { formatEther, parseEther } from "viem";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "../lib/contract";

type Campaign = {
  title: string;
  description: string;
  goal: bigint;
  totalRaised: bigint;
  deadline: bigint;
};

export default function CampaignCard({
  id,
  camp,
}: {
  id: number;
  camp: Campaign;
}) {
  const [amount, setAmount] = useState("");
  // Removed unused txHash state

  // leitura ao vivo dessa campanha (watch = atualiza em novos blocos)
  const {
    data: live,
    refetch,
    isFetching: isRefreshing,
    error: readError,
  } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "getCampaign",
    args: [BigInt(id)],
    // watch: true, // Removed unsupported property
  }) as { data?: Campaign; refetch: () => void; isFetching: boolean; error?: any };

  const data = (live ?? camp) as Campaign;

  const { data: hash, writeContractAsync } = useWriteContract();
  const { isLoading: isMining, isSuccess: isMined } =
    useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isMined) {
      refetch?.();
      setAmount("");
    }
  }, [isMined, refetch]);

  const goalEth = useMemo(() => Number(formatEther(data.goal)), [data.goal]);
  const raisedEth = useMemo(
    () => Number(formatEther(data.totalRaised)),
    [data.totalRaised]
  );
  const percent = useMemo(() => {
    if (!goalEth || goalEth <= 0) return 0;
    return Math.min((raisedEth / goalEth) * 100, 100);
  }, [goalEth, raisedEth]);

  const timeLeftLabel = useMemo(() => {
    const ms = Number(data.deadline) * 1000 - Date.now();
    if (ms <= 0) return "ended";
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    return `${d}d ${h}h left`;
  }, [data.deadline]);

  const handleContribute = async () => {
    if (!amount) return alert("Enter an amount in ETH");
    try {
      await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "contribute",
        args: [BigInt(id)],
        value: parseEther(amount),
      });
      // Removed setTxHash since txHash is unused
    } catch (err: any) {
      alert(err?.shortMessage || err?.message || "Failed to contribute");
    }
  };

  return (
    <div className="bg-[#121212] border border-[#292929] rounded-2xl p-5 shadow-md transition hover:scale-[1.02] hover:border-[#5b21b6] duration-200">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">{data.title}</h3>
        {isRefreshing && (
          <span className="text-[10px] text-purple-300 bg-purple-900/30 border border-purple-800 px-2 py-0.5 rounded-full">
            updating…
          </span>
        )}
      </div>

      <p className="text-sm text-gray-400 mt-1 mb-4">{data.description}</p>

      <div className="w-full bg-gray-800 rounded-full h-2 mb-2 overflow-hidden">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
        <span>
          Raised: <span className="text-gray-200">{raisedEth.toFixed(3)}</span> /{" "}
          <span className="text-gray-200">{goalEth.toFixed(3)}</span> ETH
        </span>
        <span className="text-gray-500">{timeLeftLabel}</span>
      </div>

      <div className="flex gap-2 items-center">
        <input
          type="number"
          min="0"
          step="0.001"
          placeholder="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={isMining}
          className="w-28 px-2 py-1 text-sm bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:border-purple-500 disabled:opacity-60"
        />
        <button
          onClick={handleContribute}
          disabled={isMining}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/60 text-white text-sm px-3 py-1.5 rounded-md"
        >
          {isMining ? "Sending..." : "Contribute"}
        </button>
      </div>

      {hash && (
        <p className="text-xs text-gray-400 mt-2">
          Tx: <span className="text-gray-300">{hash.slice(0, 10)}...</span>
        </p>
      )}
      {isMined && (
        <p className="text-green-400 text-xs mt-1">✅ Contribution confirmed!</p>
      )}

      {readError && (
        <p className="text-red-400 text-xs mt-2">
          Failed to refresh: {String(readError.message ?? readError)}
        </p>
      )}

      <p className="text-[11px] text-gray-500 mt-3">
        Deadline: {new Date(Number(data.deadline) * 1000).toLocaleString()}
      </p>
    </div>
  );
}
