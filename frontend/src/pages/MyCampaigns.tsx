import { useNavigate } from "react-router-dom";
import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
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
  media: string;
  approved: boolean;
  held: boolean;
  reports: bigint;
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

// milestone label helper
function milestoneLabel(pct: number) {
  if (pct >= 100) return "🎯 Goal reached!";
  if (pct >= 50) return "🔥 50% funded";
  if (pct >= 25) return "🚀 25% funded";
  return null;
}

// status label helper
function statusLabel(raisedEth: number, goalEth: number, ended: boolean) {
  if (raisedEth >= goalEth) return { text: "Goal reached ✅", cls: "text-green-400" };
  if (ended && raisedEth < goalEth) return { text: "Failed (goal not met)", cls: "text-red-400" };
  if (ended) return { text: "Ended", cls: "text-gray-400" };
  return { text: "Active", cls: "text-yellow-300" };
}

function CampaignCard({
  id,
  camp,
  onOpen,
  onEdit,
  onWithdraw,
  canWithdraw,
}: {
  id: number;
  camp: Campaign;
  onOpen: (id: number) => void;
  onEdit: (prefill: URLSearchParams) => void;
  onWithdraw: (id: number) => void;
  canWithdraw: boolean;
}) {
  const goalEth = Number(formatUnits(camp.goal, 18));
  const raisedEth = Number(formatUnits(camp.totalRaised, 18));
  const percent = goalEth > 0 ? Math.floor((raisedEth / goalEth) * 100) : 0;

  const nowSec = Math.floor(Date.now() / 1000);
  const secsLeft = Number(camp.deadline) - nowSec;
  const ended = secsLeft <= 0;
  const daysLeft = ended ? 0 : Math.floor(secsLeft / (60 * 60 * 24));

  const milestone = milestoneLabel(percent);
  const status = statusLabel(raisedEth, goalEth, ended);

  // prefill params for edit->create flow
  const params = new URLSearchParams({
    title: camp.title,
    description: camp.description,
    goal: goalEth.toString(),
    deadline: camp.deadline.toString(),
  });

  return (
    <div
      className="bg-white/5 p-4 rounded-lg hover:scale-[1.01] transition"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(id)}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(id); }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-white truncate">{camp.title}</h3>
          <p className="text-sm text-white/70 mt-1 line-clamp-2">{camp.description}</p>

          {milestone && (
            <div className="mt-2 text-xs font-medium text-purple-300 bg-purple-900/30 border border-purple-600/40 rounded px-2 py-1 inline-block">
              {milestone}
            </div>
          )}
        </div>

        <div className="text-right text-sm shrink-0">
          <p className="text-white/80">{raisedEth.toFixed(4)} / {goalEth.toFixed(4)} ETH</p>
          <p className="text-white/50">{percent}%</p>
        </div>
      </div>

      <div className="mt-3">
        <ProgressBar percent={percent} />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className={`text-sm ${status.cls}`}>{status.text}</div>

        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(params); }}
            className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-sm"
          >
            Edit
          </button>

          {canWithdraw && (
            <button
              onClick={(e) => { e.stopPropagation(); onWithdraw(id); }}
              className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-sm text-white"
            >
              Withdraw
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 text-xs text-white/60">
        {camp.withdrawn ? (
          <span className="text-yellow-400">Withdrawn</span>
        ) : ended ? (
          <span>Deadline passed</span>
        ) : (
          <span>{daysLeft} day{daysLeft !== 1 ? "s" : ""} left</span>
        )}
      </div>
    </div>
  );
}

export default function MyCampaigns() {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  if (!address) return <p>Connect your wallet.</p>;

  // read nextId
  const { data: nextId } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
  }) as { data?: bigint };

  const count = Number(nextId ?? 0n);
  if (count === 0) return <p className="text-white/60">You have no campaigns yet.</p>;

  // batch read campaigns
  const calls =
    Array.from({ length: count }, (_, id) => ({
      address: CROWDFUND_ADDRESS,
      abi: CROWDFUND_ABI as unknown as Abi,
      functionName: "getCampaign" as const,
      args: [BigInt(id)],
    })) ?? [];

  const { data } = useReadContracts({ contracts: calls, allowFailure: true });

  // filter mine
  const mine =
    data
      ?.map((r, id) => {
        if (r.status !== "success") return null;
        const c = r.result as unknown as Campaign;
        if (!c?.exists) return null;
        if (c.owner.toLowerCase() !== address!.toLowerCase()) return null;
        return { id, c };
      })
      .filter(Boolean) as { id: number; c: Campaign }[] ?? [];

  if (!mine.length) return <p className="text-white/60">You have no campaigns yet.</p>;

  // open details (optional route if you have it)
  const openCampaign = (id: number) => navigate(`/campaign/${id}`);

  // edit -> go to /create with query params
  const editCampaign = (prefill: URLSearchParams) => navigate(`/create?${prefill.toString()}`);

  // withdraw writer
  async function doWithdraw(id: number) {
    try {
      await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "withdraw",
        args: [BigInt(id)],
      });
      // optional: toast and/or refetch by navigating or rely on polling
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {mine.map(({ id, c }) => {
        const goalEth = Number(formatUnits(c.goal, 18));
        const raisedEth = Number(formatUnits(c.totalRaised, 18));

        // simple withdraw rule: owner, not withdrawn, goal reached
        const canWithdraw =
          c.owner.toLowerCase() === address!.toLowerCase() &&
          !c.withdrawn &&
          raisedEth >= goalEth;

        return (
          <CampaignCard
            key={id}
            id={id}
            camp={c}
            onOpen={openCampaign}
            onEdit={editCampaign}
            onWithdraw={doWithdraw}
            canWithdraw={canWithdraw && !isPending}
          />
        );
      })}
    </div>
  );
}
