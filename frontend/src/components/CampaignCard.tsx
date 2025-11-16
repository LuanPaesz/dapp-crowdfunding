import { useNavigate } from "react-router-dom";
import { formatUnits } from "viem";

// -------- helper para media (image / YouTube) --------

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      // formato: https://youtu.be/VIDEO_ID
      return u.pathname.replace("/", "") || null;
    }
    if (u.hostname.includes("youtube.com")) {
      // formato: https://www.youtube.com/watch?v=VIDEO_ID
      const v = u.searchParams.get("v");
      if (v) return v;
      // formato embed etc
      const parts = u.pathname.split("/");
      const last = parts[parts.length - 1];
      return last || null;
    }
    return null;
  } catch {
    return null;
  }
}

function isImageUrl(url: string): boolean {
  const clean = url.split("?")[0].toLowerCase();
  return (
    clean.endsWith(".png") ||
    clean.endsWith(".jpg") ||
    clean.endsWith(".jpeg") ||
    clean.endsWith(".gif") ||
    clean.endsWith(".webp") ||
    clean.endsWith(".svg")
  );
}

function MediaPreview({ media, title }: { media?: string; title: string }) {
  if (!media) return null;

  const ytId = getYouTubeId(media);
  if (ytId) {
    const embedUrl = `https://www.youtube.com/embed/${ytId}`;
    return (
      <div className="w-full aspect-video rounded-t-xl overflow-hidden bg-black">
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
      <div className="w-full aspect-video rounded-t-xl overflow-hidden bg-black">
        <img
          src={media}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // se não for imagem nem YouTube, não mostra nada (evita ícone quebrado)
  return null;
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
};

// -------- progress bar --------

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

// -------- main card --------

type Props = {
  id: number;
  camp: Campaign;
};

export default function CampaignCard({ id, camp }: Props) {
  const navigate = useNavigate();

  const goalEth = Number(formatUnits(camp.goal, 18));
  const raisedEth = Number(formatUnits(camp.totalRaised, 18));
  const percent =
    camp.goal > 0n ? Number((camp.totalRaised * 100n) / camp.goal) : 0;

  const nowSec = Math.floor(Date.now() / 1000);
  const secsLeft = Number(camp.deadline) - nowSec;
  const daysLeft = secsLeft > 0 ? Math.floor(secsLeft / (60 * 60 * 24)) : 0;

  let statusLabel = "Active";
  let statusColor = "text-green-400";
  if (camp.withdrawn) {
    statusLabel = "Withdrawn";
    statusColor = "text-yellow-400";
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
      className="bg-white/5 rounded-xl overflow-hidden hover:scale-[1.01] transition cursor-pointer flex flex-col"
      onClick={() => navigate(`/campaign/${id}`)}
    >
      {/* media (image / YouTube) */}
      <MediaPreview media={camp.media} title={camp.title} />

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex justify-between items-start gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">{camp.title}</h3>
            <p className="text-sm text-white/60 mt-1 line-clamp-2">
              {camp.description}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="text-white/80">
              {raisedEth.toFixed(4)} / {goalEth.toFixed(4)} ETH
            </p>
            <p className="text-white/50">{percent}%</p>
          </div>
        </div>

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
