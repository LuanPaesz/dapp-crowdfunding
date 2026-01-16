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
      <div className="mt-4 w-full max-h-[420px] rounded-xl overflow-hidden bg-black">
        <iframe
          src={embedUrl}
          title={title}
          className="w-full h-[420px]"
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
          onError={(e) => {
            // fallback simples para evitar quebrar layout
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
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

export default function CampaignDetail() {
  // ✅ hooks SEMPRE no topo
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [amountEth, setAmountEth] = useState("0.01");

  const [backersCount, setBackersCount] = useState<number | null>(null);
  const [avgContributionEth, setAvgContributionEth] = useState<number | null>(null);
  const [myTxs, setMyTxs] = useState<{ amountEth: number; blockNumber: bigint }[]>([]);

  // ✅ campaignId “seguro” (nunca chama BigInt(undefined))
  const campaignId = useMemo(() => {
    try {
      return BigInt(id ?? "0");
    } catch {
      return 0n;
    }
  }, [id]);

  // ✅ leitura do contrato
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

  // ✅ valores “seguros” pra hooks (mesmo quando raw ainda está vazio)
  const safeGoal = raw?.goal ?? 0n;
  const safeRaised = raw?.totalRaised ?? 0n;
  const safePercent = safeGoal > 0n ? Number((safeRaised * 100n) / safeGoal) : 0;

  const goalEth = Number(formatUnits(safeGoal, 18));
  const raisedEth = Number(formatUnits(safeRaised, 18));

  // ✅ hooks de animação SEMPRE chamados (nunca depois de return)
  const raisedAnim = useAnimatedNumber(raisedEth, 600);
  const percentAnim = useAnimatedNumber(Math.max(0, Math.min(100, safePercent)), 600);

  // ✅ #14/#15 logs: roda sempre, mas só executa se tiver publicClient e campanha válida
  useEffect(() => {
    let alive = true;

    async function loadLogs() {
      if (!publicClient) return;
      if (!id) return; // id inválido
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

  // ✅ agora sim: returns condicionais (depois de todos hooks)
  if (!id) return <p className="p-6">Invalid campaign id.</p>;
  if (isLoading) return <p className="p-6">Loading campaign…</p>;
  if (error) return <p className="p-6 text-red-400">Error: {String(error)}</p>;
  if (!raw || !raw.exists) return <p className="p-6">Campaign not found.</p>;

  // daqui pra baixo raw existe de verdade
  const c = raw;

  const nowSec = Math.floor(Date.now() / 1000);
  const secsLeft = Number(c.deadline) - nowSec;
  const daysLeft = secsLeft > 0 ? Math.floor(secsLeft / (60 * 60 * 24)) : 0;
  const ended = secsLeft <= 0;
  const success = c.totalRaised >= c.goal;

  const isOwner = !!address && c.owner.toLowerCase() === address.toLowerCase();

  const myContributionEth = myContribution ? Number(formatUnits(myContribution, 18)) : 0;

  // -------------------- actions --------------------
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

  // -------------------- render --------------------
  return (
    <div className="max-w-3xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
      <button
        className="text-sm text-white/60 hover:text-white mb-2"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold">{c.title}</h1>
      <p className="text-white/70">{c.description}</p>

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

      {errorMsg && (
        <div className="text-red-300 text-sm bg-red-950/40 border border-red-800 rounded px-3 py-2">
          {errorMsg}
        </div>
      )}
      {infoMsg && (
        <div className="text-green-300 text-sm bg-green-950/30 border border-green-800 rounded px-3 py-2">
          {infoMsg}
        </div>
      )}

      {/* Progress / status */}
      <div className="space-y-2 mt-4">
        <div className="flex justify-between text-sm">
          <span className="text-white/60">
            Raised: <span className="text-white">{raisedAnim.toFixed(4)}</span> /{" "}
            <span className="text-white">{goalEth.toFixed(4)} ETH</span>
          </span>
          <span className="text-white/60">{percentAnim.toFixed(0)}%</span>
        </div>

        <div className="w-full bg-white/10 rounded h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
            style={{ width: `${Math.max(0, Math.min(100, percentAnim))}%` }}
          />
        </div>

        <Milestones percent={safePercent} />

        <div className="text-sm text-white/60">
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

        <div className="text-sm">
          Status:{" "}
          {!c.approved ? (
            <span className="text-yellow-300">Pending approval</span>
          ) : c.held ? (
            <span className="text-yellow-300">Held by admin</span>
          ) : (
            <span className="text-green-400">Approved</span>
          )}
        </div>

        {/* #14 stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-xs text-white/60">Backers (estimated)</div>
            <div className="text-lg font-semibold">{backersCount ?? "—"}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-xs text-white/60">Avg contribution</div>
            <div className="text-lg font-semibold">
              {avgContributionEth === null ? "—" : `${avgContributionEth.toFixed(4)} ETH`}
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-xs text-white/60">Reports</div>
            <div className="text-lg font-semibold">{Number(c.reports)}</div>
          </div>
        </div>
      </div>

      {/* My contribution + history */}
      <div className="mt-4 space-y-2">
        <p className="text-sm text-white/70">
          Your contribution in this campaign:{" "}
          <span className="text-white">{myContributionEth.toFixed(6)} ETH</span>
        </p>

        {!!myTxs.length && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-xs text-white/60 mb-2">Your contribution history</div>
            <div className="space-y-1">
              {myTxs.slice(0, 6).map((x, i) => (
                <div key={i} className="text-sm text-white/80">
                  + {x.amountEth.toFixed(6)} ETH{" "}
                  <span className="text-white/40">(block {x.blockNumber.toString()})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 items-center flex-wrap">
          {!ended && c.approved && !c.held && (
            <>
              <input
                type="number"
                min={0}
                step="0.001"
                value={amountEth}
                onChange={(e) => setAmountEth(e.target.value)}
                className="px-3 py-2 rounded bg-white/10 border border-white/20 text-sm"
              />
              <button
                disabled={isPending}
                onClick={handleContribute}
                className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/60 text-sm"
              >
                {isPending ? "Sending…" : "Contribute"}
              </button>
            </>
          )}

          {c.approved && (
            <button
              disabled={isPending}
              onClick={handleReport}
              className="px-4 py-2 rounded bg-yellow-600/70 hover:bg-yellow-600 disabled:opacity-60 text-sm"
            >
              {isPending ? "Reporting…" : "Report campaign"}
            </button>
          )}

          {ended && !success && (myContribution ?? 0n) > 0n && (
            <button
              onClick={handleRefund}
              className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-sm"
            >
              Claim refund
            </button>
          )}

          {isOwner && success && !c.withdrawn && (
            <button
              disabled={isPending}
              onClick={handleWithdraw}
              className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 disabled:opacity-60 text-sm"
            >
              {isPending ? "Withdrawing…" : "Withdraw funds"}
            </button>
          )}

          {isOwner && success && c.withdrawn && (
            <span className="text-sm text-green-300">✅ Funds withdrawn</span>
          )}
          {isOwner && !success && !ended && (
            <span className="text-sm text-white/50">Waiting deadline / goal…</span>
          )}
        </div>
      </div>

      {/* #9 updates */}
      <CampaignUpdates campaignId={campaignId} isOwner={isOwner} />
    </div>
  );
}
