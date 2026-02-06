// frontend/src/pages/CampaignDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "../lib/contract";
import CampaignUpdates from "../components/CampaignUpdates";
import { useEthUsdPrice, formatUsd } from "../lib/pricing";

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

// -------------------- media helpers --------------------
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

function MediaBlock({ media, title }: { media?: string; title: string }) {
  if (!media) return null;

  const ytId = getYouTubeId(media);
  if (ytId) {
    const embedUrl = `https://www.youtube.com/embed/${ytId}`;
    return (
      <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
        <div className="aspect-video w-full">
          <iframe
            src={embedUrl}
            title={title}
            className="w-full h-full"
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
        <div className="aspect-video w-full flex items-center justify-center">
          <img
            src={media}
            alt={title}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      </div>
    );
  }

  return null;
}

// -------------------- small UI helpers --------------------
function useAnimatedNumber(value: number, durationMs = 600) {
  const [display, setDisplay] = useState<number>(value);

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
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);

  return display;
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
    <div className="flex gap-2 flex-wrap mt-2">
      {badge("25%", reached25)}
      {badge("50%", reached50)}
      {badge("Funded", reached100)}
    </div>
  );
}

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

  const [backersCount, setBackersCount] = useState<number | null>(null);
  const [avgContributionEth, setAvgContributionEth] = useState<number | null>(null);
  const [myTxs, setMyTxs] = useState<{ amountEth: number; blockNumber: bigint }[]>([]);

  const campaignId = useMemo(() => {
    try {
      return BigInt(id ?? "0");
    } catch {
      return 0n;
    }
  }, [id]);

  const { data: raw, isLoading, error, refetch } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "getCampaign",
    args: [campaignId],
    query: { refetchInterval: 2000 },
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
      (address ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    ],
    query: { enabled: !!address, refetchInterval: 3000 },
  }) as { data?: bigint };

  const safeGoal = raw?.goal ?? 0n;
  const safeRaised = raw?.totalRaised ?? 0n;
  const safePercent = safeGoal > 0n ? Number((safeRaised * 100n) / safeGoal) : 0;

  const goalEth = Number(formatUnits(safeGoal, 18));
  const raisedEth = Number(formatUnits(safeRaised, 18));

  const raisedAnim = useAnimatedNumber(raisedEth, 600);
  const percentAnim = useAnimatedNumber(Math.max(0, Math.min(100, safePercent)), 600);

  useEffect(() => {
    let alive = true;

    async function loadLogs() {
      if (!publicClient) return;
      if (!id) return;
      if (campaignId < 0n) return;

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

        const contributors = new Set<string>();
        let total = 0n;
        const my: { amountEth: number; blockNumber: bigint }[] = [];

        for (const l of logs) {
          const contributor = (l.args?.contributor as string | undefined) ?? "";
          const amount = (l.args?.amount as bigint | undefined) ?? 0n;

          if (contributor) contributors.add(contributor.toLowerCase());
          total += amount;

          if (address && contributor.toLowerCase() === address.toLowerCase()) {
            const eth = Number(formatUnits(amount, 18));
            my.push({ amountEth: eth, blockNumber: l.blockNumber ?? 0n });
          }
        }

        const count = logs.length;
        const backers = contributors.size;
        const avg = count > 0 ? Number(formatUnits(total, 18)) / count : 0;

        if (!alive) return;
        setBackersCount(backers);
        setAvgContributionEth(count > 0 ? avg : null);

        my.sort((a, b) => (a.blockNumber > b.blockNumber ? -1 : 1));
        setMyTxs(my);
      } catch {
        if (!alive) return;
        setBackersCount(null);
        setAvgContributionEth(null);
        setMyTxs([]);
      }
    }

    loadLogs();
    const t = setInterval(loadLogs, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [publicClient, campaignId, address, id]);

  if (!id) return <p className="p-6">Invalid campaign id.</p>;
  if (isLoading) return <p className="p-6">Loading campaign…</p>;
  if (error) return <p className="p-6 text-red-400">Error: {String(error)}</p>;
  if (!raw || !raw.exists) return <p className="p-6">Campaign not found.</p>;

  const c = raw;

  const nowSec = Math.floor(Date.now() / 1000);
  const secsLeft = Number(c.deadline) - nowSec;
  const daysLeft = secsLeft > 0 ? Math.floor(secsLeft / 86400) : 0;
  const ended = secsLeft <= 0;
  const success = c.totalRaised >= c.goal;

  const isOwner = !!address && c.owner.toLowerCase() === address.toLowerCase();
  const myContributionEth = myContribution ? Number(formatUnits(myContribution, 18)) : 0;

  const raisedUsd = ethUsd ? raisedAnim * ethUsd : null;
  const goalUsd = ethUsd ? goalEth * ethUsd : null;
  const myUsd = ethUsd ? myContributionEth * ethUsd : null;
  const avgUsd = ethUsd && avgContributionEth !== null ? avgContributionEth * ethUsd : null;

  async function handleContribute() {
    setErrorMsg(null);
    setInfoMsg(null);

    if (!isConnected || !address) return setErrorMsg("Please connect your wallet first.");
    if (!amountEth || Number(amountEth) <= 0) return setErrorMsg("Amount must be greater than 0.");

    try {
      const value = parseUnits(amountEth, 18);
      await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "contribute",
        args: [campaignId],
        value,
      });

      setInfoMsg("✅ Contribution sent!");
      setAmountEth("0.01");
      await refetch();
    } catch (err: any) {
      setErrorMsg(err?.shortMessage || err?.message || "Contribution failed.");
    }
  }

  async function handleRefund() {
    setErrorMsg(null);
    setInfoMsg(null);

    if (!isConnected || !address) return setErrorMsg("Please connect your wallet first.");
    if (!myContribution || myContribution === 0n)
      return setErrorMsg("You have nothing to refund in this campaign.");

    try {
      await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "refund",
        args: [campaignId],
      });
      setInfoMsg("✅ Refund requested.");
      await refetch();
    } catch (err: any) {
      setErrorMsg(err?.shortMessage || err?.message || "Refund failed.");
    }
  }

  async function handleWithdraw() {
    setErrorMsg(null);
    setInfoMsg(null);

    if (!isConnected || !address) return setErrorMsg("Please connect your wallet first.");
    if (!isOwner) return setErrorMsg("Only the campaign owner can withdraw.");
    if (!success) return setErrorMsg("Goal not reached yet.");
    if (c.withdrawn) return setErrorMsg("Already withdrawn.");

    try {
      await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "withdraw",
        args: [campaignId],
      });
      setInfoMsg("✅ Funds withdrawn successfully.");
      await refetch();
    } catch (err: any) {
      setErrorMsg(err?.shortMessage || err?.message || "Withdraw failed.");
    }
  }

  async function handleReport() {
    setErrorMsg(null);
    setInfoMsg(null);

    if (!isConnected || !address) return setErrorMsg("Please connect your wallet first.");

    try {
      await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "reportCampaign",
        args: [campaignId],
      });
      setInfoMsg("✅ Campaign reported.");
      await refetch();
    } catch (err: any) {
      setErrorMsg(err?.shortMessage || err?.message || "Report failed.");
    }
  }

  return (
    <div className="space-y-6">
      <button
        className="text-sm text-white/60 hover:text-white"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* LEFT */}
        <section className="space-y-5">
          <div>
            <h1 className="text-3xl font-bold">{c.title}</h1>
            <p className="text-white/70 mt-2">{c.description}</p>
          </div>

          <MediaBlock media={c.media} title={c.title} />

          {c.projectLink && (
            <a
              href={c.projectLink}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm text-purple-400 hover:text-purple-300 underline"
            >
              View project link
            </a>
          )}

          {errorMsg && (
            <div className="text-red-200 text-sm bg-red-950/40 border border-red-800/60 rounded-xl px-3 py-2">
              {errorMsg}
            </div>
          )}
          {infoMsg && (
            <div className="text-green-200 text-sm bg-green-950/30 border border-green-800/60 rounded-xl px-3 py-2">
              {infoMsg}
            </div>
          )}

          <CampaignUpdates campaignId={campaignId} isOwner={isOwner} />
        </section>

        {/* RIGHT */}
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

              <div className="pt-3 border-t border-white/10 text-sm text-white/60 space-y-2">
                <div className="flex justify-between">
                  <span>Status</span>
                  <span>
                    {!c.approved ? (
                      <span className="text-yellow-300">Pending</span>
                    ) : c.held ? (
                      <span className="text-yellow-300">Held</span>
                    ) : (
                      <span className="text-green-400">Approved</span>
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Owner</span>
                  <span className="text-white/80 truncate max-w-[180px]">
                    {c.owner}
                  </span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-4 space-y-3">
              {!ended && c.approved && !c.held && (
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
                      onChange={(e) => setAmountEth(e.target.value)}
                      className="input"
                    />
                    <button
                      disabled={isPending}
                      onClick={handleContribute}
                      className="btn-primary whitespace-nowrap"
                    >
                      {isPending ? "Sending…" : "Contribute"}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {c.approved && (
                  <button disabled={isPending} onClick={handleReport} className="btn">
                    {isPending ? "Reporting…" : "Report campaign"}
                  </button>
                )}

                {ended && !success && (myContribution ?? 0n) > 0n && (
                  <button onClick={handleRefund} className="btn">
                    Claim refund
                  </button>
                )}

                {isOwner && success && !c.withdrawn && (
                  <button
                    disabled={isPending}
                    onClick={handleWithdraw}
                    className="btn-primary"
                  >
                    {isPending ? "Withdrawing…" : "Withdraw funds"}
                  </button>
                )}

                {isOwner && success && c.withdrawn && (
                  <div className="text-sm text-green-300">✅ Funds withdrawn</div>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-3">
            <div className="card">
              <div className="text-xs text-white/60">Backers (estimated)</div>
              <div className="text-2xl font-bold">{backersCount ?? "—"}</div>
            </div>

            <div className="card">
              <div className="text-xs text-white/60">Avg contribution</div>
              <div className="text-2xl font-bold">
                {avgContributionEth === null ? "—" : `${avgContributionEth.toFixed(4)} ETH`}
              </div>
              <div className="text-sm text-white/50">
                {avgUsd !== null ? formatUsd(avgUsd) : ""}
              </div>
            </div>

            <div className="card">
              <div className="text-xs text-white/60">Reports</div>
              <div className="text-2xl font-bold">{Number(c.reports)}</div>
            </div>

            {!!myTxs.length && (
              <div className="card">
                <div className="text-xs text-white/60 mb-2">Your contribution history</div>
                <div className="space-y-1">
                  {myTxs.slice(0, 6).map((x, i) => (
                    <div key={i} className="text-sm text-white/80">
                      + {x.amountEth.toFixed(6)} ETH{" "}
                      <span className="text-white/40">
                        (block {x.blockNumber.toString()})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
