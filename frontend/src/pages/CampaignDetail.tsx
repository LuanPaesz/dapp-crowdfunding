// frontend/src/pages/CampaignDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { formatUnits, parseUnits } from "viem";
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
  media?: string;
  projectLink?: string;
  approved: boolean;
  held: boolean;
  reports: bigint;
};

type CampaignUpdate = {
  timestamp: number;
  message: string;
};

// Detects YouTube video ID from common URL formats
function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.replace("/", "") || null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/");
      const last = parts[parts.length - 1];
      return last || null;
    }
    return null;
  } catch {
    return null;
  }
}

// Checks if URL looks like an image
function isImageUrl(url: string): boolean {
  const clean = url.split("?")[0].toLowerCase();
  const exts = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];
  return exts.some((ext) => clean.includes(ext));
}

// Renders media block: YouTube iframe or image, or nothing
function MediaBlock({ media, title }: { media?: string; title: string }) {
  if (!media) return null;

  const ytId = getYouTubeId(media);
  if (ytId) {
    const embedUrl = `https://www.youtube.com/embed/${ytId}`;
    return (
      <div className="mt-4 w-full max-h-[420px] rounded-xl overflow-hidden bg-black">
        <iframe
          src={embedUrl}
          title={title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (isImageUrl(media)) {
    return (
      <div className="mt-4 w-full max-h-[420px] rounded-xl overflow-hidden bg-black flex items-center justify-center">
        <img
          src={media}
          alt={title}
          className="max-h-[420px] w-auto object-contain"
        />
      </div>
    );
  }

  return null;
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const [updates, setUpdates] = useState<CampaignUpdate[]>([]);
  const [newUpdate, setNewUpdate] = useState("");

  if (!id) return <p>Invalid campaign id.</p>;
  const campaignId = BigInt(id);

  const {
    data: raw,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "getCampaign",
    args: [campaignId],
    query: {
      refetchInterval: 2000,
    },
  }) as {
    data?: Campaign;
    isLoading: boolean;
    error?: any;
    refetch: () => void;
  };

  const { data: myContribution } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "contributions",
    args: [
      campaignId,
      address ?? "0x0000000000000000000000000000000000000000",
    ],
    query: {
      enabled: !!address,
      refetchInterval: 4000,
    },
  }) as { data?: bigint };

  useEffect(() => {
    const key = `updates:${campaignId.toString()}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        setUpdates(JSON.parse(raw));
      } catch {
        setUpdates([]);
      }
    }
  }, [campaignId]);

  function saveUpdates(next: CampaignUpdate[]) {
    const key = `updates:${campaignId.toString()}`;
    localStorage.setItem(key, JSON.stringify(next));
    setUpdates(next);
  }

  if (isLoading) return <p className="p-6">Loading campaign…</p>;
  if (error) return <p className="p-6 text-red-400">Error: {String(error)}</p>;
  if (!raw || !raw.exists) return <p className="p-6">Campaign not found.</p>;

  const c = raw;

  const goalEth = Number(formatUnits(c.goal, 18));
  const raisedEth = Number(formatUnits(c.totalRaised, 18));
  const percent = c.goal > 0n ? Number((c.totalRaised * 100n) / c.goal) : 0;

  const milestones: string[] = [];
  if (percent >= 25) milestones.push("25%");
  if (percent >= 50) milestones.push("50%");
  if (percent >= 100) milestones.push("100%");

  const nowSec = Math.floor(Date.now() / 1000);
  const secsLeft = Number(c.deadline) - nowSec;
  const daysLeft = secsLeft > 0 ? Math.floor(secsLeft / (60 * 60 * 24)) : 0;
  const ended = secsLeft <= 0;
  const success = c.totalRaised >= c.goal;
  const myContributionEth = myContribution
    ? Number(formatUnits(myContribution, 18))
    : 0;

  const isOwner =
    !!address && c.owner.toLowerCase() === address.toLowerCase();

  async function handleContribute(amountEth: string) {
    if (!isConnected || !address) {
      alert("Please connect your wallet first.");
      return;
    }
    if (!amountEth || Number(amountEth) <= 0) {
      alert("Amount must be greater than 0.");
      return;
    }
    try {
      const value = parseUnits(amountEth, 18);
      await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "contribute",
        args: [campaignId],
        value,
      });
      await refetch();
      const input = document.getElementById(
        "contrib-amount"
      ) as HTMLInputElement | null;
      if (input) input.value = "0.01";
      alert("Contribution sent!");
    } catch (err: any) {
      alert(err?.shortMessage || err?.message || "Contribution failed.");
    }
  }

  async function handleRefund() {
    if (!isConnected || !address) {
      alert("Please connect your wallet first.");
      return;
    }
    if (!myContribution || myContribution === 0n) {
      alert("You have nothing to refund in this campaign.");
      return;
    }
    try {
      await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "refund",
        args: [campaignId],
      });
      await refetch();
      alert("Refund requested.");
    } catch (err: any) {
      alert(err?.shortMessage || err?.message || "Refund failed.");
    }
  }

  async function handleWithdraw() {
    if (!isConnected || !address) {
      alert("Please connect your wallet first.");
      return;
    }
    if (!isOwner) {
      alert("Only the campaign owner can withdraw.");
      return;
    }
    if (!(ended || success)) {
      alert("Campaign is not releasable yet.");
      return;
    }
    if (c.totalRaised < c.goal) {
      alert("Goal not reached; cannot withdraw.");
      return;
    }
    if (c.withdrawn) {
      alert("Already withdrawn.");
      return;
    }

    try {
      await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "withdraw",
        args: [campaignId],
      });
      await refetch();
      alert("Withdraw successful.");
    } catch (err: any) {
      alert(err?.shortMessage || err?.message || "Withdraw failed.");
    }
  }

  async function handleReport() {
    if (!isConnected || !address) {
      alert("Please connect your wallet to report.");
      return;
    }
    if (isOwner) {
      alert("Owners cannot report their own campaigns.");
      return;
    }

    try {
      await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "reportCampaign",
        args: [campaignId],
      });
      await refetch();
      alert("Campaign reported. Thank you for helping keep the platform safe.");
    } catch (err: any) {
      alert(err?.shortMessage || err?.message || "Report failed.");
    }
  }

  function handleAddUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!isOwner) {
      alert("Only the campaign owner can post updates.");
      return;
    }
    if (!newUpdate.trim()) return;

    const next = [
      {
        timestamp: Date.now(),
        message: newUpdate.trim(),
      },
      ...updates,
    ];
    saveUpdates(next);
    setNewUpdate("");
  }

  return (
    <div className="max-w-3xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
      <button
        className="text-sm text-white/60 hover:text-white"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <div>
        <h1 className="text-2xl font-bold">{c.title}</h1>
        <p className="text-white/70 mt-2">{c.description}</p>

        {/* media (image or YouTube) */}
        <MediaBlock media={c.media} title={c.title} />

        {c.projectLink && (
          <a
            href={c.projectLink}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-3 text-sm text-purple-400 hover:text-purple-300 underline"
          >
            View project link
          </a>
        )}
      </div>

      <div className="space-y-2 mt-2">
        <div className="flex justify-between text-sm">
          <span className="text-white/60">
            Raised:{" "}
            <span className="text-white">{raisedEth.toFixed(4)} ETH</span> /{" "}
            <span className="text-white">{goalEth.toFixed(4)} ETH</span>
          </span>
          <span className="text-white/60">
            {percent}%{" "}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-600/20 border border-green-500/40 ml-1">
              Real-time
            </span>
          </span>
        </div>
        <div className="w-full bg-white/10 rounded h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
            style={{
              width: `${Math.max(0, Math.min(100, percent))}%`,
            }}
          />
        </div>

        {milestones.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs text-white/70 mt-1">
            {milestones.map((m) => (
              <span
                key={m}
                className="px-2 py-0.5 rounded-full bg-purple-600/20 border border-purple-500/40"
              >
                Milestone {m} reached
              </span>
            ))}
          </div>
        )}

        <div className="text-sm text-white/60 mt-1">
          {ended ? (
            success ? (
              <span className="text-green-400">Goal reached</span>
            ) : (
              <span className="text-red-400">Failed (goal not reached)</span>
            )
          ) : (
            <span>
              {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
            </span>
          )}{" "}
          · Owner: <span className="text-white/80">{c.owner}</span>
        </div>

        <div className="text-sm text-white/60 flex flex-col gap-1 mt-1">
          {typeof c.approved === "boolean" && (
            <div>
              Status:{" "}
              {c.approved ? (
                <span className="text-green-400">Approved</span>
              ) : (
                <span className="text-yellow-400">Pending approval</span>
              )}
            </div>
          )}
          <div>
            Reports:{" "}
            <span
              className={
                c.reports && c.reports > 0n
                  ? "text-red-400"
                  : "text-white/80"
              }
            >
              {c.reports?.toString() ?? "0"}
            </span>
            {c.held && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-red-600/20 border border-red-500/40 text-red-300">
                On hold
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-2">
        <p className="text-sm text-white/70">
          Your contribution in this campaign:{" "}
          <span className="text-white">
            {myContributionEth.toFixed(6)} ETH
          </span>
        </p>
        <p className="text-xs text-white/50">
          You can contribute multiple times. All contributions are added
          together on-chain.
        </p>

        <div className="flex flex-wrap gap-3 items-center">
          {!ended && (c.approved ?? true) && !c.held && (
            <>
              <input
                type="number"
                min={0}
                step="0.001"
                defaultValue="0.01"
                id="contrib-amount"
                className="px-3 py-2 rounded bg-white/10 border border-white/20 text-sm"
              />
              <button
                disabled={isPending}
                onClick={() => {
                  const input = document.getElementById(
                    "contrib-amount"
                  ) as HTMLInputElement | null;
                  handleContribute(input?.value || "0");
                }}
                className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/60 text-sm"
              >
                {isPending ? "Sending…" : "Contribute"}
              </button>
            </>
          )}

          {ended && !success && (myContribution ?? 0n) > 0n && (
            <button
              onClick={handleRefund}
              className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-sm"
            >
              Claim refund
            </button>
          )}

          {!isOwner && (
            <button
              type="button"
              onClick={handleReport}
              className="px-3 py-2 rounded bg-red-700/70 hover:bg-red-700 text-xs ml-auto"
            >
              Report campaign
            </button>
          )}
        </div>
      </div>

      {isOwner && (
        <div className="mt-4 border-t border-white/10 pt-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-white/70">Owner actions</span>
            <button
              onClick={handleWithdraw}
              disabled={
                isPending || !( (ended || success) && c.totalRaised >= c.goal && !c.withdrawn )
              }
              className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50"
            >
              {c.withdrawn ? "Already withdrawn" : "Withdraw funds"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        <h2 className="text-lg font-semibold">Campaign updates</h2>

        {isOwner && (
          <form onSubmit={handleAddUpdate} className="space-y-2">
            <textarea
              value={newUpdate}
              onChange={(e) => setNewUpdate(e.target.value)}
              placeholder="Share a progress update, milestone, or message to backers..."
              className="w-full px-3 py-2 rounded bg-white/5 border border-white/15 text-sm"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-700 text-xs"
            >
              Post update
            </button>
          </form>
        )}

        {updates.length === 0 ? (
          <p className="text-sm text-white/60">
            No updates posted yet.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {updates.map((u, idx) => (
              <li
                key={idx}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2"
              >
                <div className="text-[11px] text-white/50 mb-1">
                  {new Date(u.timestamp).toLocaleString()}
                </div>
                <div className="text-white/80 whitespace-pre-wrap">
                  {u.message}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
