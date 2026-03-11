import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
} from "wagmi";
import type { Abi } from "abitype";
import { formatUnits } from "viem";
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

type ProgressBarProps = Readonly<{
  percent: number;
}>;

type CampaignCardProps = Readonly<{
  id: number;
  camp: Campaign;
  onOpen: (id: number) => void;
  onEdit: (prefill: URLSearchParams) => void;
  onWithdraw: (id: number) => void;
  isPendingTx: boolean;
  currentUser: `0x${string}`;
}>;

function ProgressBar({ percent }: ProgressBarProps) {
  const safePercent = Math.max(0, Math.min(100, percent));

  return (
    <div className="h-3 w-full overflow-hidden rounded bg-white/10">
      <div
        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
        style={{ width: `${safePercent}%` }}
        aria-valuenow={safePercent}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

function milestoneLabel(percent: number): string | null {
  if (percent >= 100) {
    return "🎯 Goal reached!";
  }

  if (percent >= 50) {
    return "🔥 50% funded";
  }

  if (percent >= 25) {
    return "🚀 25% funded";
  }

  return null;
}

function statusLabel(raisedEth: number, goalEth: number, ended: boolean) {
  if (raisedEth >= goalEth) {
    return { text: "Goal reached ✅", className: "text-green-400" };
  }

  if (ended) {
    return { text: "Failed (goal not met)", className: "text-red-400" };
  }

  return { text: "Active", className: "text-yellow-300" };
}

function canWithdrawReason(params: {
  isOwner: boolean;
  withdrawn: boolean;
  approved: boolean;
  held: boolean;
  ended: boolean;
  goalReached: boolean;
}) {
  const { isOwner, withdrawn, approved, held, ended, goalReached } = params;

  if (!isOwner) {
    return null;
  }

  if (withdrawn) {
    return "Already withdrawn.";
  }

  if (!approved) {
    return "Campaign not approved by admin yet.";
  }

  if (held) {
    return "Campaign is on hold by admin.";
  }

  if (!ended) {
    return "You can withdraw only after the deadline ends.";
  }

  if (!goalReached) {
    return "Goal not reached yet.";
  }

  return null;
}

function handleCardKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  onOpen: () => void
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onOpen();
  }
}

function CampaignCard({
  id,
  camp,
  onOpen,
  onEdit,
  onWithdraw,
  isPendingTx,
  currentUser,
}: CampaignCardProps) {
  const goalEth = Number(formatUnits(camp.goal, 18));
  const raisedEth = Number(formatUnits(camp.totalRaised, 18));
  const percent = goalEth > 0 ? Math.floor((raisedEth / goalEth) * 100) : 0;

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const ended = nowInSeconds >= Number(camp.deadline);
  const secondsLeft = Number(camp.deadline) - nowInSeconds;
  const daysLeft = ended ? 0 : Math.floor(secondsLeft / (60 * 60 * 24));

  const milestone = milestoneLabel(percent);
  const status = statusLabel(raisedEth, goalEth, ended);

  const prefillParams = new URLSearchParams({
    title: camp.title,
    description: camp.description,
    goal: goalEth.toString(),
    deadline: camp.deadline.toString(),
  });

  const isOwner = camp.owner.toLowerCase() === currentUser.toLowerCase();
  const goalReached = raisedEth >= goalEth;

  const reason = canWithdrawReason({
    isOwner,
    withdrawn: camp.withdrawn,
    approved: camp.approved,
    held: camp.held,
    ended,
    goalReached,
  });

  const canWithdraw = isOwner && reason === null;

  let deadlineText: ReactNode = (
    <span>
      {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
    </span>
  );

  if (camp.withdrawn) {
    deadlineText = <span className="text-yellow-400">Withdrawn</span>;
  } else if (ended) {
    deadlineText = <span>Deadline passed</span>;
  }

  const withdrawClassName =
    canWithdraw && !isPendingTx
      ? "bg-green-600 hover:bg-green-700"
      : "cursor-not-allowed bg-green-600/30 opacity-70";

  return (
    <button
      type="button"
      className="rounded-lg bg-white/5 p-4 text-left transition hover:scale-[1.01]"
      onClick={() => onOpen(id)}
      onKeyDown={(event) => handleCardKeyDown(event, () => onOpen(id))}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-white">{camp.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-white/70">
            {camp.description}
          </p>

          {milestone ? (
            <div className="mt-2 inline-block rounded border border-purple-600/40 bg-purple-900/30 px-2 py-1 text-xs font-medium text-purple-300">
              {milestone}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 text-right text-sm">
          <p className="text-white/80">
            {raisedEth.toFixed(4)} / {goalEth.toFixed(4)} ETH
          </p>
          <p className="text-white/50">{percent}%</p>
        </div>
      </div>

      <div className="mt-3">
        <ProgressBar percent={percent} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className={`text-sm ${status.className}`}>{status.text}</div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(prefillParams);
            }}
            className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
          >
            Edit
          </button>

          {isOwner ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();

                if (!canWithdraw) {
                  return;
                }

                onWithdraw(id);
              }}
              disabled={!canWithdraw || isPendingTx}
              title={reason ?? ""}
              className={`rounded px-3 py-1 text-sm text-white ${withdrawClassName}`}
            >
              {isPendingTx ? "Withdrawing..." : "Withdraw"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-2 space-y-1 text-xs text-white/60">
        {deadlineText}

        {isOwner && reason ? (
          <div className="text-xs text-white/50">ⓘ {reason}</div>
        ) : null}
      </div>
    </button>
  );
}

function getErrorMessage(error: unknown): string {
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

  return "Withdraw failed.";
}

export default function MyCampaigns() {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const [uiError, setUiError] = useState<string | null>(null);

  const hasAddress = Boolean(address);

  const { data: nextId } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
    query: { enabled: hasAddress },
  });

  const count = Number((nextId as bigint | undefined) ?? 0n);

  const calls = useMemo(() => {
    if (!hasAddress || count <= 0) {
      return [];
    }

    return Array.from({ length: count }, (_, id) => ({
      address: CROWDFUND_ADDRESS,
      abi: CROWDFUND_ABI as Abi,
      functionName: "getCampaign" as const,
      args: [BigInt(id)],
    }));
  }, [hasAddress, count]);

  const { data } = useReadContracts({
    contracts: calls,
    allowFailure: true,
    query: { enabled: hasAddress && calls.length > 0 },
  });

  const mine = useMemo(() => {
    if (!address) {
      return [];
    }

    return (
      data?.flatMap((result, id) => {
        if (result?.status !== "success") {
          return [];
        }

        const campaign = result.result as Campaign;

        if (!campaign.exists) {
          return [];
        }

        if (campaign.owner.toLowerCase() !== address.toLowerCase()) {
          return [];
        }

        return [{ id, c: campaign }];
      }) ?? []
    );
  }, [data, address]);

  if (!address) {
    return <p>Connect your wallet.</p>;
  }

  if (count === 0 || mine.length === 0) {
    return <p className="text-white/60">You have no campaigns yet.</p>;
  }

  const openCampaign = (id: number) => {
    navigate(`/campaign/${id}`);
  };

  const editCampaign = (prefill: URLSearchParams) => {
    navigate(`/create?${prefill.toString()}`);
  };

  async function doWithdraw(id: number) {
    setUiError(null);

    try {
      await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "withdraw",
        args: [BigInt(id)],
      });
    } catch (error) {
      setUiError(getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-3">
      {uiError ? (
        <div className="rounded border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {uiError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mine.map(({ id, c }) => (
          <CampaignCard
            key={id}
            id={id}
            camp={c}
            onOpen={openCampaign}
            onEdit={editCampaign}
            onWithdraw={doWithdraw}
            isPendingTx={isPending}
            currentUser={address}
          />
        ))}
      </div>
    </div>
  );
}