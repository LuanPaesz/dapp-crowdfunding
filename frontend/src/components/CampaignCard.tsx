// frontend/src/components/CampaignCard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatUnits } from "viem";
import { useEthUsdPrice, formatUsd } from "../lib/pricing";

// =========================================================
// Helpers para mídia (imagem / YouTube)
// =========================================================
function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "") || null;
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/");
      return parts[parts.length - 1] || null;
    }
    return null;
  } catch {
    return null;
  }
}

function isImageUrl(url: string): boolean {
  const clean = url.split("?")[0].toLowerCase();
  const exts = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];
  return exts.some((ext) => clean.includes(ext));
}

function MediaPreview({ media, title }: { media?: string; title: string }) {
  if (!media) return null;

  const ytId = getYouTubeId(media);
  if (ytId) {
    const embedUrl = `https://www.youtube.com/embed/${ytId}`;
    return (
      <div className="w-full aspect-video rounded-t-2xl overflow-hidden bg-black">
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
      <div className="w-full aspect-video rounded-t-2xl overflow-hidden bg-black">
        <img src={media} alt={title} className="w-full h-full object-cover" />
      </div>
    );
  }

  return null;
}

// =========================================================
// Hook: anima número quando valor muda
// =========================================================
function useAnimatedNumber(value: number, durationMs = 500) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = display;
    const to = value;

    if (!Number.isFinite(from) || !Number.isFinite(to)) {
      setDisplay(value);
      return;
    }
    if (from === to) return;

    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return display;
}

// =========================================================
// Tipagem Campaign
// =========================================================
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

// =========================================================
// UI: progress + milestones
// =========================================================
function ProgressBar({ percent }: { percent: number }) {
  const safe = Math.max(0, Math.min(100, percent));
  return (
    <div className="w-full rounded-full overflow-hidden bg-white/10 h-2">
      <div
        className="h-full transition-all duration-500"
        style={{
          width: `${safe}%`,
          background:
            "linear-gradient(90deg, rgba(139,92,246,1) 0%, rgba(236,72,153,1) 100%)",
        }}
      />
    </div>
  );
}

function Milestones({ percent }: { percent: number }) {
  const p = Math.max(0, Math.min(100, percent));
  const reached25 = p >= 25;
  const reached50 = p >= 50;
  const reached100 = p >= 100;

  const badge = (label: string, ok: boolean) => (
    <span
      className={
        "text-[11px] px-2 py-0.5 rounded-full border " +
        (ok
          ? "bg-green-500/10 border-green-500/30 text-green-300"
          : "bg-white/5 border-white/10 text-white/50")
      }
    >
      {label}
    </span>
  );

  return (
    <div className="flex gap-2 flex-wrap">
      {badge("25%", reached25)}
      {badge("50%", reached50)}
      {badge("Funded", reached100)}
    </div>
  );
}

// =========================================================
// Main Card
// =========================================================
export default function CampaignCard({ id, camp }: { id: number; camp: Campaign }) {
  const navigate = useNavigate();

  const ethUsd = useEthUsdPrice();

  const goalEth = Number(formatUnits(camp.goal, 18));
  const raisedEth = Number(formatUnits(camp.totalRaised, 18));

  const percent = camp.goal > 0n ? Number((camp.totalRaised * 100n) / camp.goal) : 0;

  const nowSec = Math.floor(Date.now() / 1000);
  const secsLeft = Number(camp.deadline) - nowSec;
  const daysLeft = secsLeft > 0 ? Math.floor(secsLeft / 86400) : 0;

  // número animado
  const raisedAnim = useAnimatedNumber(raisedEth, 500);

  const raisedUsd = ethUsd ? raisedAnim * ethUsd : null;
  const goalUsd = ethUsd ? goalEth * ethUsd : null;

  // status
  let statusLabel = "Active";
  let statusColor = "text-green-400";

  if (camp.held) {
    statusLabel = "Held";
    statusColor = "text-yellow-300";
  } else if (!camp.approved) {
    statusLabel = "Pending";
    statusColor = "text-yellow-300";
  } else if (camp.withdrawn) {
    statusLabel = "Withdrawn";
    statusColor = "text-yellow-300";
  } else if (daysLeft <= 0) {
    if (camp.totalRaised >= camp.goal) {
      statusLabel = "Goal reached";
      statusColor = "text-green-400";
    } else {
      statusLabel = "Failed";
      statusColor = "text-red-400";
    }
  }

  return (
    <div
      className="card card-hover overflow-hidden cursor-pointer flex flex-col p-0"
      onClick={() => navigate(`/campaign/${id}`)}
    >
      <MediaPreview media={camp.media} title={camp.title} />

      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white truncate">{camp.title}</h3>
            <p className="text-sm text-white/60 mt-1 line-clamp-2">
              {camp.description}
            </p>
          </div>

          <div className="text-right text-sm shrink-0">
            <p className="text-white/90 font-semibold">
              {raisedAnim.toFixed(4)} / {goalEth.toFixed(4)} ETH
            </p>

            {/* USD */}
            <p className="text-white/50">
              {raisedUsd !== null && goalUsd !== null ? (
                <>
                  {formatUsd(raisedUsd)} / {formatUsd(goalUsd)}
                </>
              ) : (
                "USD loading…"
              )}
            </p>

            <p className="text-white/50 mt-1">
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
          <span className={statusColor}>{statusLabel}</span>
        </div>
      </div>
    </div>
  );
}
