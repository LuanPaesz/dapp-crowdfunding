import { useNavigate } from "react-router-dom";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { Abi, formatUnits } from "viem";
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

function ProgressBar({ percent }: { percent: number }) {
  const safe = Math.max(0, Math.min(100, percent));
  return (
    <div className="w-full bg-white/10 rounded h-3 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
        style={{ width: `${safe}%` }}
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

function CampaignCard({
  id,
  camp,
  onOpen,
  onEdit,
}: {
  id: number;
  camp: Campaign;
  onOpen: (id: number) => void;
  onEdit: (id: number) => void;
}) {
  const goalEth = Number(formatUnits(camp.goal, 18));
  const raisedEth = Number(formatUnits(camp.totalRaised, 18));

  const percent =
    camp.goal > 0n ? Number((camp.totalRaised * 100n) / camp.goal) : 0;

  const nowSec = Math.floor(Date.now() / 1000);
  const secsLeft = Number(camp.deadline) - nowSec;
  const daysLeft = secsLeft > 0 ? Math.floor(secsLeft / (60 * 60 * 24)) : 0;

  return (
    <div className="bg-white/5 p-4 rounded-lg cursor-pointer hover:scale-[1.01] transition"
         onClick={() => onOpen(id)}
         role="button"
         tabIndex={0}
         onKeyDown={(e) => { if (e.key === "Enter") onOpen(id); }}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-white">{camp.title}</h3>
          <p className="text-sm text-white/60 mt-1">{camp.description}</p>
        </div>
        <div className="text-right text-sm">
          <p className="text-white/80">{raisedEth.toFixed(4)} / {goalEth.toFixed(4)} ETH</p>
          <p className="text-white/50">{percent}%</p>
        </div>
      </div>

      <div className="mt-3">
        <ProgressBar percent={percent} />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-white/60">
          {camp.withdrawn ? (
            <span className="text-yellow-400">Withdrawn</span>
          ) : daysLeft > 0 ? (
            <span>{daysLeft} day{daysLeft !== 1 ? "s" : ""} left</span>
          ) : (
            <span className="text-red-400">Ended</span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(id); }}
            className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-sm"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyCampaigns() {
  const navigate = useNavigate();
  const { address } = useAccount();
  if (!address) return <p>Connect your wallet.</p>;

  const { data: nextId } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
  }) as { data?: bigint };

  const count = Number(nextId ?? 0n);
  if (count === 0) return <p className="text-white/60">You have no campaigns yet.</p>;

  const calls =
    Array.from({ length: count }, (_, id) => ({
      address: CROWDFUND_ADDRESS,
      abi: CROWDFUND_ABI as unknown as Abi,
      functionName: "getCampaign" as const,
      args: [BigInt(id)],
    })) ?? [];

  const { data } = useReadContracts({ contracts: calls, allowFailure: true });

  const mine =
    data
      ?.map((r, id) => {
        if (r.status !== "success") return null;
        const c = r.result as unknown as Campaign;
        if (!c?.exists) return null;
        if (c.owner.toLowerCase() !== address!.toLowerCase()) return null;
        return { id, c };
      })
      .filter(Boolean) ?? [];

  if (!mine.length) return <p className="text-white/60">You have no campaigns yet.</p>;

  const openCampaign = (id: number) => navigate(`/campaign/${id}`);
  const editCampaign = (id: number) => navigate(`/campaign/${id}/edit`);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {mine.map((it) => {
        const { id, c } = it as { id: number; c: Campaign };
        return (
          <CampaignCard
            key={id}
            id={id}
            camp={c}
            onOpen={openCampaign}
            onEdit={editCampaign}
          />
        );
      })}
    </div>
  );
}