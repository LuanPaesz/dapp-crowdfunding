import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatUnits } from "viem";
import { useEthUsdPrice, formatUsd } from "../lib/pricing";

function getYouTubeId(url: string): string | null {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname.includes("youtu.be")) {
      return parsedUrl.pathname.replace("/", "") || null;
    }

    if (parsedUrl.hostname.includes("youtube.com")) {
      const videoId = parsedUrl.searchParams.get("v");
      if (videoId) {
        return videoId;
      }

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

type MediaPreviewProps = Readonly<{
  media?: string;
  title: string;
}>;

function MediaPreview({ media, title }: MediaPreviewProps) {
  if (!media) {
    return null;
  }

  const youtubeId = getYouTubeId(media);

  if (youtubeId) {
    const embedUrl = `https://www.youtube.com/embed/${youtubeId}`;

    return (
      <div className="aspect-video w-full overflow-hidden rounded-t-2xl bg-black">
        <iframe
          src={embedUrl}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (isImageUrl(media)) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-t-2xl bg-black">
        <img src={media} alt={title} className="h-full w-full object-cover" />
      </div>
    );
  }

  return null;
}

function useAnimatedNumber(value: number, durationMs = 500) {
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

    if (from === to) {
      return;
    }

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

type ProgressBarProps = Readonly<{
  percent: number;
}>;

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

type MilestonesProps = Readonly<{
  percent: number;
}>;

function Milestones({ percent }: MilestonesProps) {
  const safePercent = Math.max(0, Math.min(100, percent));
  const reached25 = safePercent >= 25;
  const reached50 = safePercent >= 50;
  const reached100 = safePercent >= 100;

  const renderBadge = (label: string, reached: boolean) => (
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

  return (
    <div className="flex flex-wrap gap-2">
      {renderBadge("25%", reached25)}
      {renderBadge("50%", reached50)}
      {renderBadge("Funded", reached100)}
    </div>
  );
}

type CampaignCardProps = Readonly<{
  id: number;
  camp: Campaign;
}>;

type CampaignStatus = {
  label: string;
  color: string;
};

function getCampaignStatus(campaign: Campaign, daysLeft: number): CampaignStatus {
  if (campaign.held) {
    return { label: "Held", color: "text-yellow-300" };
  }

  if (!campaign.approved) {
    return { label: "Pending", color: "text-yellow-300" };
  }

  if (campaign.withdrawn) {
    return { label: "Withdrawn", color: "text-yellow-300" };
  }

  if (daysLeft <= 0) {
    if (campaign.totalRaised >= campaign.goal) {
      return { label: "Goal reached", color: "text-green-400" };
    }

    return { label: "Failed", color: "text-red-400" };
  }

  return { label: "Active", color: "text-green-400" };
}

export default function CampaignCard({ id, camp }: CampaignCardProps) {
  const navigate = useNavigate();
  const ethUsd = useEthUsdPrice();

  const goalEth = Number(formatUnits(camp.goal, 18));
  const raisedEth = Number(formatUnits(camp.totalRaised, 18));
  const percent =
    camp.goal > 0n ? Number((camp.totalRaised * 100n) / camp.goal) : 0;

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const secondsLeft = Number(camp.deadline) - nowInSeconds;
  const daysLeft = secondsLeft > 0 ? Math.floor(secondsLeft / 86400) : 0;

  const animatedRaised = useAnimatedNumber(raisedEth, 500);
  const raisedUsd = ethUsd ? animatedRaised * ethUsd : null;
  const goalUsd = ethUsd ? goalEth * ethUsd : null;

  const status = getCampaignStatus(camp, daysLeft);

  const goToDetails = () => {
    navigate(`/campaign/${id}`);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      goToDetails();
    }
  };

  return (
    <div
      className="card card-hover flex cursor-pointer flex-col overflow-hidden p-0"
      onClick={goToDetails}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <MediaPreview media={camp.media} title={camp.title} />

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-white">
              {camp.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-white/60">
              {camp.description}
            </p>
          </div>

          <div className="shrink-0 text-right text-sm">
            <p className="font-semibold text-white/90">
              {animatedRaised.toFixed(4)} / {goalEth.toFixed(4)} ETH
            </p>

            <p className="text-white/50">
              {raisedUsd !== null && goalUsd !== null
                ? `${formatUsd(raisedUsd)} / ${formatUsd(goalUsd)}`
                : "USD loading…"}
            </p>

            <p className="mt-1 text-white/50">
              {Math.max(0, Math.min(100, percent))}%
            </p>
          </div>
        </div>

        <Milestones percent={percent} />
        <ProgressBar percent={percent} />

        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">
            {daysLeft > 0 ? `${daysLeft} days left` : "0 days left"}
          </span>
          <span className={status.color}>{status.label}</span>
        </div>
      </div>
    </div>
  );
}