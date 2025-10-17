import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { useState } from "react";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "../lib/contract";

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

export default function CampaignCard({ id }: { id: bigint }) {
  const { address } = useAccount();
  const [eth, setEth] = useState("0.1");

  const { data, error } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "getCampaign",
    args: [id],
    query: { retry: 0 },
  }) as { data?: Campaign; error?: unknown };

  const { writeContractAsync } = useWriteContract();

  // se falhar ou não existir, não renderiza
  if (error || !data || !data.exists) return null;

  const { owner, title, description, goal, deadline, totalRaised, withdrawn } = data;
  const goalReached = (totalRaised ?? 0n) >= (goal ?? 0n);

  const contribute = async () => {
    await writeContractAsync({
      address: CROWDFUND_ADDRESS,
      abi: CROWDFUND_ABI,
      functionName: "contribute",
      args: [id],
      value: parseEther(eth || "0"),
    });
    alert("Contribute sent!");
  };

  const refund = async () => {
    await writeContractAsync({
      address: CROWDFUND_ADDRESS,
      abi: CROWDFUND_ABI,
      functionName: "refund",
      args: [id],
    });
  };

  const withdraw = async () => {
    await writeContractAsync({
      address: CROWDFUND_ADDRESS,
      abi: CROWDFUND_ABI,
      functionName: "withdraw",
      args: [id],
    });
  };

  return (
    <div className="p-4 border border-white/10 rounded-2xl bg-white/[0.02]">
      <h3 className="font-semibold">#{String(id)} — {title}</h3>
      <p className="text-sm text-white/70">{description}</p>
      <p className="text-sm mt-1">Meta: {Number(goal)/1e18} ETH</p>
      <p className="text-sm">Arrecadado: {Number(totalRaised)/1e18} ETH</p>
      <p className="text-xs text-white/50 mt-1 break-all">Owner: {owner}</p>
      <p className="text-xs text-white/50">Prazo: {new Date(Number(deadline)*1000).toLocaleString()}</p>

      <div className="mt-2 flex gap-2 items-center">
        <input className="input w-24 bg-white/5 border-white/10" value={eth} onChange={(e)=>setEth(e.target.value)} />
        <button className="btn bg-[#06B6D4] hover:bg-[#0891B2] border-transparent" disabled={!address} onClick={contribute}>
          Contribute
        </button>
        <button className="btn" disabled={!address} onClick={refund}>Refund</button>
        <button className="btn" disabled={!address || !goalReached || withdrawn} onClick={withdraw}>Withdraw</button>
      </div>
    </div>
  );
}
