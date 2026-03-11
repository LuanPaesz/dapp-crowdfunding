import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "../lib/contract";
import CampaignUpdates from "../components/CampaignUpdates";
import { formatUsd, useEthUsdPrice } from "../lib/pricing";

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

type ContributionHistoryItem = {
  key: string;
  amountEth: number;
  blockNumber: bigint;
};

type MediaBlockProps = Readonly<{
  media?: string;
  title: string;
}>;

type MilestonesProps = Readonly<{
  percent: number;
}>;

type ProgressBarProps = Readonly<{
  percent: number;
}>;

type StatCardProps = Readonly<{
  label: string;
  value: string;
  sub?: string;
}>;

type StatusBadgeProps = Readonly<{
  campaign: Campaign;
}>;

type ContributionActionsProps = Readonly<{
  ended: boolean;
  approved: boolean;
  held: boolean;
  myContributionEth: number;
  myUsd: number | null;
  amountEth: string;
  isPending: boolean;
  onAmountChange: (value: string) => void;
  onContribute: () => void;
}>;

type SecondaryActionsProps = Readonly<{
  approved: boolean;
  ended: boolean;
  success: boolean;
  myContribution: bigint;
  isOwner: boolean;
  withdrawn: boolean;
  isPending: boolean;
  onReport: () => void;
  onRefund: () => void;
  onWithdraw: () => void;
}>;

type ActionContext = Readonly<{
  isConnected: boolean;
  address?: `0x${string}`;
  campaignId: bigint;
  amountEth: string;
  myContribution: bigint;
  isOwner: boolean;
  success: boolean;
  withdrawn: boolean;
}>;

type CampaignMainSectionProps = Readonly<{
  campaign: Campaign;
  campaignId: bigint;
  isOwner: boolean;
  errorMsg: string | null;
  infoMsg: string | null;
}>;

type CampaignSidebarProps = Readonly<{
  campaign: Campaign;
  ended: boolean;
  daysLeft: number;
  safePercent: number;
  goalEth: number;
  raisedAnim: number;
  percentAnim: number;
  goalUsd: number | null;
  raisedUsd: number | null;
  myContribution: bigint;
  myContributionEth: number;
  myUsd: number | null;
  avgContributionEth: number | null;
  avgUsd: number | null;
  backersCount: number | null;
  myTxs: ContributionHistoryItem[];
  success: boolean;
  isOwner: boolean;
  amountEth: string;
  isPending: boolean;
  onAmountChange: (value: string) => void;
  onContribute: () => void;
  onReport: () => void;
  onRefund: () => void;
  onWithdraw: () => void;
}>;

function getErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "shortMessage" in error &&
    typeof error.shortMessage === "string"
  ) {
    return error.shortMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function getYouTubeId(url: string): string | null {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname.includes("youtu.be")) {
      return parsedUrl.pathname.replace("/", "") || null;
    }

    if (parsedUrl.hostname.includes("youtube.com")) {
      const videoId = parsedUrl.searchParams.get("v");
      if (videoId) return videoId;

      const pathParts = parsedUrl.pathname.split("/");
      return pathParts[pathParts.length - 1] || null;
    }

    return null;
  } catch {
    return null;
  }
}

function isImageUrl(url: string): boolean {
  const cleanUrl = url.split("?")[0].toLowerCase();
  const extensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];
  return extensions.some((extension) => cleanUrl.includes(extension));
}

function MediaBlock({ media, title }: MediaBlockProps) {
  if (!media) return null;

  const youtubeId = getYouTubeId(media);

  if (youtubeId) {
    const embedUrl = `https://www.youtube.com/embed/${youtubeId}`;

    return (
      <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
        <div className="aspect-video w-full">
          <iframe
            src={embedUrl}
            title={title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  if (isImageUrl(media)) {
    return (
      <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
        <div className="flex aspect-video w-full items-center justify-center">
          <img
            src={media}
            alt={title}
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        </div>
      </div>
    );
  }

  return null;
}

function useAnimatedNumber(value: number, durationMs = 600) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    let animationFrameId = 0;
    const startTime = performance.now();
    const from = display;
    const to = value;

    if (!Number.isFinite(from) || !Number.isFinite(to)) {
      setDisplay(value);
      return;
    }

    if (from === to) return;

    const tick = (time: number) => {
      const progress = Math.min(1, (time - startTime) / durationMs);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setDisplay(from + (to - from) * easedProgress);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value, durationMs, display]);

  return display;
}

function renderMilestoneBadge(label: string, reached: boolean): ReactNode {
  return (
    <span
      className={
        "rounded-full border px-2 py-0.5 text-[11px] " +
        (reached
          ? "border-green-500/30 bg-green-500/10 text-green-300"
          : "border-white/10 bg-white/5 text-white/50")
      }
    >
      {label}
    </span>
  );
}

function Milestones({ percent }: MilestonesProps) {
  const safePercent = Math.max(0, Math.min(100, percent));

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {renderMilestoneBadge("25%", safePercent >= 25)}
      {renderMilestoneBadge("50%", safePercent >= 50)}
      {renderMilestoneBadge("Funded", safePercent >= 100)}
    </div>
  );
}

function ProgressBar({ percent }: ProgressBarProps) {
  const safePercent = Math.max(0, Math.min(100, percent));

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full transition-all duration-500"
        style={{
          width: `${safePercent}%`,
          background:
            "linear-gradient(90deg, rgba(139,92,246,1) 0%, rgba(236,72,153,1) 100%)",
        }}
      />
    </div>
  );
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="card">
      <div className="text-xs text-white/60">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {sub ? <div className="text-sm text-white/50">{sub}</div> : null}
    </div>
  );
}

function StatusBadge({ campaign }: StatusBadgeProps) {
  if (!campaign.approved) {
    return <span className="text-yellow-300">Pending</span>;
  }

  if (campaign.held) {
    return <span className="text-yellow-300">Held</span>;
  }

  return <span className="text-green-400">Approved</span>;
}

function ContributionActions({
  ended,
  approved,
  held,
  myContributionEth,
  myUsd,
  amountEth,
  isPending,
  onAmountChange,
  onContribute,
}: ContributionActionsProps) {
  const canContribute = !ended && approved && !held;

  if (!canContribute) return null;

  return (
    <div className="space-y-2">
      <div className="text-sm text-white/70">
        Your contribution:{" "}
        <span className="text-white">{myContributionEth.toFixed(6)} ETH</span>{" "}
        <span className="text-white/50">
          {myUsd !== null ? `(${formatUsd(myUsd)})` : ""}
        </span>
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          min={0}
          step="0.001"
          value={amountEth}
          onChange={(event) => onAmountChange(event.target.value)}
          className="input"
        />
        <button
          type="button"
          disabled={isPending}
          onClick={onContribute}
          className="btn-primary whitespace-nowrap"
        >
          {isPending ? "Sending…" : "Contribute"}
        </button>
      </div>
    </div>
  );
}

function SecondaryActions({
  approved,
  ended,
  success,
  myContribution,
  isOwner,
  withdrawn,
  isPending,
  onReport,
  onRefund,
  onWithdraw,
}: SecondaryActionsProps) {
  const canRefund = ended && !success && myContribution > 0n;
  const canWithdraw = isOwner && success && !withdrawn;
  const alreadyWithdrawn = isOwner && success && withdrawn;

  return (
    <div className="flex flex-col gap-2">
      {approved ? (
        <button type="button" disabled={isPending} onClick={onReport} className="btn">
          {isPending ? "Reporting…" : "Report campaign"}
        </button>
      ) : null}

      {canRefund ? (
        <button type="button" onClick={onRefund} className="btn">
          Claim refund
        </button>
      ) : null}

      {canWithdraw ? (
        <button
          type="button"
          disabled={isPending}
          onClick={onWithdraw}
          className="btn-primary"
        >
          {isPending ? "Withdrawing…" : "Withdraw funds"}
        </button>
      ) : null}

      {alreadyWithdrawn ? (
        <div className="text-sm text-green-300">✅ Funds withdrawn</div>
      ) : null}
    </div>
  );
}

function getDaysLeft(deadline: bigint): number {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const secondsLeft = Number(deadline) - nowInSeconds;

  if (secondsLeft <= 0) return 0;

  return Math.floor(secondsLeft / 86400);
}

function buildContributionHistory(
  logs: Array<{
    args?: {
      contributor?: string;
      amount?: bigint;
    };
    blockNumber?: bigint;
    transactionHash?: `0x${string}`;
    logIndex?: number;
  }>,
  currentAddress?: string
) {
  const contributors = new Set<string>();
  let total = 0n;
  const myTransactions: ContributionHistoryItem[] = [];

  for (const log of logs) {
    const contributor = log.args?.contributor ?? "";
    const amount = log.args?.amount ?? 0n;

    if (contributor) contributors.add(contributor.toLowerCase());
    total += amount;

    if (currentAddress && contributor.toLowerCase() === currentAddress.toLowerCase()) {
      const blockNumber = log.blockNumber ?? 0n;
      const amountEth = Number(formatUnits(amount, 18));
      const uniqueKey = `${log.transactionHash ?? "tx"}-${log.logIndex ?? 0}-${blockNumber.toString()}`;

      myTransactions.push({
        key: uniqueKey,
        amountEth,
        blockNumber,
      });
    }
  }

  myTransactions.sort((left, right) => {
    if (left.blockNumber === right.blockNumber) return 0;
    return left.blockNumber > right.blockNumber ? -1 : 1;
  });

  const averageContributionEth =
    logs.length > 0 ? Number(formatUnits(total, 18)) / logs.length : null;

  return {
    backersCount: contributors.size,
    avgContributionEth: averageContributionEth,
    myTransactions,
  };
}

function getCampaignViewState(campaign: Campaign, address?: `0x${string}`) {
  const daysLeft = getDaysLeft(campaign.deadline);
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const ended = daysLeft === 0 && Number(campaign.deadline) <= nowInSeconds;
  const success = campaign.totalRaised >= campaign.goal;
  const isOwner =
    Boolean(address) && campaign.owner.toLowerCase() === address?.toLowerCase();

  return { daysLeft, ended, success, isOwner };
}

function renderCampaignState(
  id: string | undefined,
  isLoading: boolean,
  error: unknown,
  raw: Campaign | undefined
) {
  if (!id) {
    return <p className="p-6">Invalid campaign id.</p>;
  }

  if (isLoading) {
    return <p className="p-6">Loading campaign…</p>;
  }

  if (error) {
    return (
      <p className="p-6 text-red-400">
        Error: {getErrorMessage(error, "Failed to load campaign.")}
      </p>
    );
  }

  if (!raw || !raw.exists) {
    return <p className="p-6">Campaign not found.</p>;
  }

  return null;
}

function useContributionHistory(
  publicClient: ReturnType<typeof usePublicClient>,
  campaignId: bigint,
  id: string | undefined,
  address?: `0x${string}`
) {
  const [backersCount, setBackersCount] = useState<number | null>(null);
  const [avgContributionEth, setAvgContributionEth] = useState<number | null>(null);
  const [myTxs, setMyTxs] = useState<ContributionHistoryItem[]>([]);

  useEffect(() => {
    let isActive = true;

    async function loadLogs() {
      if (!publicClient || !id || campaignId < 0n) return;

      try {
        const logs = await publicClient.getLogs({
          address: CROWDFUND_ADDRESS,
          event: {
            type: "event",
            name: "Contributed",
            inputs: [
              { indexed: true, name: "id", type: "uint256" },
              { indexed: true, name: "contributor", type: "address" },
              { indexed: false, name: "amount", type: "uint256" },
            ],
          },
          args: { id: campaignId },
          fromBlock: 0n,
          toBlock: "latest",
        });

        if (!isActive) return;

        const history = buildContributionHistory(logs, address);
        setBackersCount(history.backersCount);
        setAvgContributionEth(history.avgContributionEth);
        setMyTxs(history.myTransactions);
      } catch {
        if (!isActive) return;

        setBackersCount(null);
        setAvgContributionEth(null);
        setMyTxs([]);
      }
    }

    void loadLogs();

    const timerId = window.setInterval(() => {
      void loadLogs();
    }, 5000);

    return () => {
      isActive = false;
      window.clearInterval(timerId);
    };
  }, [publicClient, campaignId, address, id]);

  return { backersCount, avgContributionEth, myTxs };
}

function getCampaignMetrics(
  campaign: Campaign,
  myContribution: bigint,
  ethUsd: number | null
) {
  const safeGoal = campaign.goal ?? 0n;
  const safeRaised = campaign.totalRaised ?? 0n;
  const safePercent =
    safeGoal > 0n ? Number((safeRaised * 100n) / safeGoal) : 0;

  const goalEth = Number(formatUnits(safeGoal, 18));
  const raisedEth = Number(formatUnits(safeRaised, 18));
  const myContributionEth = Number(formatUnits(myContribution, 18));

  const goalUsd = ethUsd ? goalEth * ethUsd : null;
  const raisedUsd = ethUsd ? raisedEth * ethUsd : null;
  const myUsd = ethUsd ? myContributionEth * ethUsd : null;

  return {
    safePercent,
    goalEth,
    raisedEth,
    myContributionEth,
    goalUsd,
    raisedUsd,
    myUsd,
  };
}

function useCampaignActions(
  writeContractAsync: ReturnType<typeof useWriteContract>["writeContractAsync"],
  refetchCampaign: () => void,
  setErrorMsg: (value: string | null) => void,
  setInfoMsg: (value: string | null) => void,
  setAmountEth: (value: string) => void
) {
  const clearMessages = () => {
    setErrorMsg(null);
    setInfoMsg(null);
  };

  const ensureConnected = (ctx: ActionContext) => {
    if (!ctx.isConnected || !ctx.address) {
      setErrorMsg("Please connect your wallet first.");
      return false;
    }
    return true;
  };

  const handleContribute = async (ctx: ActionContext) => {
    clearMessages();

    if (!ensureConnected(ctx)) return;
    if (!ctx.amountEth || Number(ctx.amountEth) <= 0) {
      setErrorMsg("Amount must be greater than 0.");
      return;
    }

    try {
      const value = parseUnits(ctx.amountEth, 18);

      await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "contribute",
        args: [ctx.campaignId],
        value,
      });

      setInfoMsg("✅ Contribution sent!");
      setAmountEth("0.01");
      refetchCampaign();
    } catch (submitError) {
      setErrorMsg(getErrorMessage(submitError, "Contribution failed."));
    }
  };

  const handleRefund = async (ctx: ActionContext) => {
    clearMessages();

    if (!ensureConnected(ctx)) return;
    if (ctx.myContribution === 0n) {
      setErrorMsg("You have nothing to refund in this campaign.");
      return;
    }

    try {
      await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "refund",
        args: [ctx.campaignId],
      });

      setInfoMsg("✅ Refund requested.");
      refetchCampaign();
    } catch (submitError) {
      setErrorMsg(getErrorMessage(submitError, "Refund failed."));
    }
  };

  const handleWithdraw = async (ctx: ActionContext) => {
    clearMessages();

    if (!ensureConnected(ctx)) return;
    if (!ctx.isOwner) {
      setErrorMsg("Only the campaign owner can withdraw.");
      return;
    }
    if (!ctx.success) {
      setErrorMsg("Goal not reached yet.");
      return;
    }
    if (ctx.withdrawn) {
      setErrorMsg("Already withdrawn.");
      return;
    }

    try {
      await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "withdraw",
        args: [ctx.campaignId],
      });

      setInfoMsg("✅ Funds withdrawn successfully.");
      refetchCampaign();
    } catch (submitError) {
      setErrorMsg(getErrorMessage(submitError, "Withdraw failed."));
    }
  };

  const handleReport = async (ctx: ActionContext) => {
    clearMessages();

    if (!ensureConnected(ctx)) return;

    try {
      await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "reportCampaign",
        args: [ctx.campaignId],
      });

      setInfoMsg("✅ Campaign reported.");
      refetchCampaign();
    } catch (submitError) {
      setErrorMsg(getErrorMessage(submitError, "Report failed."));
    }
  };

  return { handleContribute, handleRefund, handleWithdraw, handleReport };
}

function CampaignMainSection({
  campaign,
  campaignId,
  isOwner,
  errorMsg,
  infoMsg,
}: CampaignMainSectionProps) {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold">{campaign.title}</h1>
        <p className="mt-2 text-white/70">{campaign.description}</p>
      </div>

      <MediaBlock media={campaign.media} title={campaign.title} />

      {campaign.projectLink ? (
        <a
          href={campaign.projectLink}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-sm text-purple-400 underline hover:text-purple-300"
        >
          View project link
        </a>
      ) : null}

      {errorMsg ? (
        <div className="rounded-xl border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {errorMsg}
        </div>
      ) : null}

      {infoMsg ? (
        <div className="rounded-xl border border-green-800/60 bg-green-950/30 px-3 py-2 text-sm text-green-200">
          {infoMsg}
        </div>
      ) : null}

      <CampaignUpdates campaignId={campaignId} isOwner={isOwner} />
    </section>
  );
}

function CampaignSidebar({
  campaign,
  ended,
  daysLeft,
  safePercent,
  goalEth,
  raisedAnim,
  percentAnim,
  goalUsd,
  raisedUsd,
  myContribution,
  myContributionEth,
  myUsd,
  avgContributionEth,
  avgUsd,
  backersCount,
  myTxs,
  success,
  isOwner,
  amountEth,
  isPending,
  onAmountChange,
  onContribute,
  onReport,
  onRefund,
  onWithdraw,
}: CampaignSidebarProps) {
  return (
    <aside className="space-y-4">
      <div className="card card-hover">
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-sm text-white/60">Pledged</div>
              <div className="text-2xl font-bold">{raisedAnim.toFixed(4)} ETH</div>
              <div className="text-sm text-white/50">
                {raisedUsd !== null ? formatUsd(raisedUsd) : "USD loading…"}
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-white/60">Goal</div>
              <div className="text-lg font-semibold">{goalEth.toFixed(4)} ETH</div>
              <div className="text-sm text-white/50">
                {goalUsd !== null ? formatUsd(goalUsd) : "—"}
              </div>
            </div>
          </div>

          <ProgressBar percent={percentAnim} />

          <div className="flex items-center justify-between text-sm text-white/60">
            <span>{percentAnim.toFixed(0)}%</span>
            <span>
              {ended ? "Ended" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
            </span>
          </div>

          <Milestones percent={safePercent} />

          <div className="space-y-2 border-t border-white/10 pt-3 text-sm text-white/60">
            <div className="flex justify-between">
              <span>Status</span>
              <span>
                <StatusBadge campaign={campaign} />
              </span>
            </div>

            <div className="flex justify-between">
              <span>Owner</span>
              <span className="max-w-[180px] truncate text-white/80">
                {campaign.owner}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <ContributionActions
            ended={ended}
            approved={campaign.approved}
            held={campaign.held}
            myContributionEth={myContributionEth}
            myUsd={myUsd}
            amountEth={amountEth}
            isPending={isPending}
            onAmountChange={onAmountChange}
            onContribute={onContribute}
          />

          <SecondaryActions
            approved={campaign.approved}
            ended={ended}
            success={success}
            myContribution={myContribution}
            isOwner={isOwner}
            withdrawn={campaign.withdrawn}
            isPending={isPending}
            onReport={onReport}
            onRefund={onRefund}
            onWithdraw={onWithdraw}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <StatCard
          label="Backers (estimated)"
          value={backersCount === null ? "—" : String(backersCount)}
        />

        <StatCard
          label="Avg contribution"
          value={
            avgContributionEth === null
              ? "—"
              : `${avgContributionEth.toFixed(4)} ETH`
          }
          sub={avgUsd !== null ? formatUsd(avgUsd) : undefined}
        />

        <StatCard
          label="Reports"
          value={String(Number(campaign.reports))}
        />

        {myTxs.length > 0 ? (
          <div className="card">
            <div className="mb-2 text-xs text-white/60">
              Your contribution history
            </div>
            <div className="space-y-1">
              {myTxs.slice(0, 6).map((item) => (
                <div key={item.key} className="text-sm text-white/80">
                  + {item.amountEth.toFixed(6)} ETH{" "}
                  <span className="text-white/40">
                    (block {item.blockNumber.toString()})
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const ethUsd = useEthUsdPrice();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [amountEth, setAmountEth] = useState("0.01");

  const campaignId = useMemo(() => {
    try {
      return BigInt(id ?? "0");
    } catch {
      return 0n;
    }
  }, [id]);

  const campaignRead = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "getCampaign",
    args: [campaignId],
    query: { refetchInterval: 2000 },
  });

  const raw = campaignRead.data as Campaign | undefined;
  const isLoading = campaignRead.isLoading;
  const error = campaignRead.error;
  const refetchCampaign = campaignRead.refetch;

  const { data: myContributionData } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "contributions",
    args: [
      campaignId,
      (address ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    ],
    query: { enabled: Boolean(address), refetchInterval: 3000 },
  });

  const myContribution = (myContributionData as bigint | undefined) ?? 0n;

  // ✅ Hooks must be called before any conditional return
  const {
    backersCount,
    avgContributionEth,
    myTxs,
  } = useContributionHistory(publicClient, campaignId, id, address);

  const campaignForMetrics: Campaign = raw ?? {
    owner: "0x0000000000000000000000000000000000000000",
    title: "",
    description: "",
    goal: 0n,
    deadline: 0n,
    totalRaised: 0n,
    withdrawn: false,
    exists: false,
    approved: false,
    held: false,
    reports: 0n,
  };

  const {
    safePercent,
    goalEth,
    raisedEth,
    myContributionEth,
    goalUsd,
    raisedUsd,
    myUsd,
  } = getCampaignMetrics(campaignForMetrics, myContribution, ethUsd);

  const raisedAnim = useAnimatedNumber(raisedEth, 600);
  const percentAnim = useAnimatedNumber(
    Math.max(0, Math.min(100, safePercent)),
    600
  );

  const actions = useCampaignActions(
    writeContractAsync,
    () => {
      void refetchCampaign();
    },
    setErrorMsg,
    setInfoMsg,
    setAmountEth
  );

  const stateContent = renderCampaignState(id, isLoading, error, raw);
  if (stateContent) return stateContent;

  if (!raw) {
    return <p className="p-6">Campaign not found.</p>;
  }

  const campaign: Campaign = raw;
  const { daysLeft, ended, success, isOwner } = getCampaignViewState(
    campaign,
    address
  );

  const avgUsd =
    ethUsd && avgContributionEth !== null ? avgContributionEth * ethUsd : null;

  const actionContext: ActionContext = {
    isConnected,
    address,
    campaignId,
    amountEth,
    myContribution,
    isOwner,
    success,
    withdrawn: campaign.withdrawn,
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        className="text-sm text-white/60 hover:text-white"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <CampaignMainSection
          campaign={campaign}
          campaignId={campaignId}
          isOwner={isOwner}
          errorMsg={errorMsg}
          infoMsg={infoMsg}
        />

        <CampaignSidebar
          campaign={campaign}
          ended={ended}
          daysLeft={daysLeft}
          safePercent={safePercent}
          goalEth={goalEth}
          raisedAnim={raisedAnim}
          percentAnim={percentAnim}
          goalUsd={goalUsd}
          raisedUsd={raisedUsd}
          myContribution={myContribution}
          myContributionEth={myContributionEth}
          myUsd={myUsd}
          avgContributionEth={avgContributionEth}
          avgUsd={avgUsd}
          backersCount={backersCount}
          myTxs={myTxs}
          success={success}
          isOwner={isOwner}
          amountEth={amountEth}
          isPending={isPending}
          onAmountChange={setAmountEth}
          onContribute={() => void actions.handleContribute(actionContext)}
          onReport={() => void actions.handleReport(actionContext)}
          onRefund={() => void actions.handleRefund(actionContext)}
          onWithdraw={() => void actions.handleWithdraw(actionContext)}
        />
      </div>
    </div>
  );
}
