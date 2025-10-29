import { useParams, useNavigate } from "react-router-dom";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "../lib/contract";
import { useAccount } from "wagmi";

type Campaign = {
  owner: `0x${string}`;
  title: string;
  description: string;
  goal: bigint;
  deadline: bigint; // timestamp seconds
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

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { address } = useAccount();

  if (!id) return <p>Invalid campaign id.</p>;
  const campaignId = BigInt(id);

  const { data: raw, isLoading, error } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "getCampaign",
    args: [campaignId],
  }) as { data?: Campaign; isLoading?: boolean; error?: any };

  if (isLoading) return <p>Loading campaign...</p>;
  if (error) {
    console.error(error);
    return <p>Erro ao carregar campanha.</p>;
  }
  if (!raw) return <p>Campaign not found.</p>;

  const camp = raw as Campaign;

  // format values
  let goalEth = "0";
  let raisedEth = "0";
  try {
    goalEth = camp.goal ? Number(formatUnits(camp.goal as bigint, 18)).toFixed(4) : "0";
    raisedEth = camp.totalRaised
      ? Number(formatUnits(camp.totalRaised as bigint, 18)).toFixed(4)
      : "0";
  } catch (e) {
    // fallback
  }

  const percent = camp.goal > 0n ? Number((camp.totalRaised * 100n) / camp.goal) : 0;
  const nowSec = Math.floor(Date.now() / 1000);
  const secsLeft = Number(camp.deadline) - nowSec;
  const daysLeft = secsLeft > 0 ? Math.floor(secsLeft / (60 * 60 * 24)) : 0;

  const isOwner = address && address.toLowerCase() === camp.owner.toLowerCase();

  return (
    <div className="max-w-3xl mx-auto bg-white/5 p-6 rounded">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">{camp.title}</h1>
          <p className="text-white/70 mb-4">{camp.description}</p>

          <div className="grid grid-cols-2 gap-4 text-sm text-white/70">
            <div>
              <div className="text-xs text-white/50">Owner</div>
              <div className="break-all">{camp.owner}</div>
            </div>

            <div>
              <div className="text-xs text-white/50">Deadline</div>
              <div>
                {camp.deadline
                  ? new Date(Number(camp.deadline) * 1000).toLocaleString()
                  : "—"}
                {daysLeft > 0 ? ` (${daysLeft} day${daysLeft !== 1 ? "s" : ""} left)` : daysLeft === 0 ? " (ends today)" : " (ended)"}
              </div>
            </div>

            <div>
              <div className="text-xs text-white/50">Goal</div>
              <div>{goalEth} ETH</div>
            </div>

            <div>
              <div className="text-xs text-white/50">Raised</div>
              <div>{raisedEth} ETH ({percent}%)</div>
            </div>
          </div>

          <div className="mt-4">
            <ProgressBar percent={percent} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
          >
            Back
          </button>

          {isOwner && (
            <button
              onClick={() => navigate(`/campaign/${id}/edit`)}
              className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700"
            >
              Edit Campaign
            </button>
          )}

          {/* Optional buttons for actions (contribute/withdraw) can be implemented later */}
        </div>
      </div>

      <div className="mt-6 text-sm text-white/60">
        <p>
          Status:{" "}
          {camp.withdrawn ? (
            <span className="text-yellow-400">Withdrawn</span>
          ) : daysLeft > 0 ? (
            <span>Active</span>
          ) : (
            <span className="text-red-400">Ended</span>
          )}
        </p>
      </div>
    </div>
  );
}