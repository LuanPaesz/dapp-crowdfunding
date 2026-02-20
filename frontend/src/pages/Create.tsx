import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { CircleCheck, CircleX, Info, Sparkles } from "lucide-react";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "../lib/contract";

function prettifyError(err: any) {
  return (
    err?.shortMessage ||
    err?.cause?.shortMessage ||
    err?.details ||
    err?.cause?.details ||
    err?.message ||
    "Transaction failed."
  );
}

export default function Create() {
  const location = useLocation();
  const navigate = useNavigate();

  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("0");
  const [durationDays, setDurationDays] = useState<number>(1);

  // ON-CHAIN metadata (strings)
  const [mediaUrl, setMediaUrl] = useState("");
  const [projectLink, setProjectLink] = useState("");

  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pTitle = params.get("title");
    const pDescription = params.get("description");
    const pGoal = params.get("goal");
    const pDeadline = params.get("deadline");
    const pMedia = params.get("media");
    const pLink = params.get("externalLink");

    if (pTitle) setTitle(pTitle);
    if (pDescription) setDescription(pDescription);
    if (pGoal) setGoal(pGoal);
    if (pMedia) setMediaUrl(pMedia);
    if (pLink) setProjectLink(pLink);

    if (pDeadline) {
      const deadlineNum = Number(pDeadline);
      if (!Number.isNaN(deadlineNum) && deadlineNum > 0) {
        const nowSec = Math.floor(Date.now() / 1000);
        const secs = Math.max(0, deadlineNum - nowSec);
        const days = Math.max(1, Math.ceil(secs / (60 * 60 * 24)));
        setDurationDays(days);
      }
    }
  }, [location.search]);

  const clean = useMemo(() => {
    return {
      title: title.trim(),
      description: description.trim(),
      media: mediaUrl.trim(),
      link: projectLink.trim(),
      duration: Number(durationDays),
    };
  }, [title, description, mediaUrl, projectLink, durationDays]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setTxHash(null);

    if (!isConnected || !address) {
      setErrorMsg("Please connect your wallet first.");
      return;
    }

    if (!publicClient) {
      setErrorMsg("Public client not ready. Refresh and try again.");
      return;
    }

    if (!CROWDFUND_ADDRESS || !String(CROWDFUND_ADDRESS).startsWith("0x")) {
      setErrorMsg("Invalid contract address. Check VITE_CROWDFUND_ADDRESS / deployed.json.");
      return;
    }

    if (!clean.title) return setErrorMsg("Title is required.");
    if (!clean.description) return setErrorMsg("Description is required.");

    let goalWei: bigint;
    try {
      goalWei = parseEther(goal);
    } catch {
      setErrorMsg("Goal must be a valid ETH number (e.g., 0.1).");
      return;
    }
    if (goalWei <= 0n) return setErrorMsg("Goal must be greater than 0.");

    if (!Number.isFinite(clean.duration) || clean.duration < 1) {
      setErrorMsg("Duration must be at least 1 day.");
      return;
    }

    const args = [
      clean.title,
      clean.description,
      clean.media,
      clean.link,
      goalWei,
      BigInt(clean.duration),
    ] as const;

    // 1) SIMULATE
    try {
      await publicClient.simulateContract({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "createCampaign",
        args,
        account: address,
      });
    } catch (simErr: any) {
      setErrorMsg(`Simulation failed: ${prettifyError(simErr)}`);
      return;
    }

    // 2) SEND (MetaMask)
    try {
      const hash = await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "createCampaign",
        args,
        gas: 1_500_000n,
      });

      setTxHash(hash);
      setInfoMsg("Transaction sent. Waiting for confirmation…");

      await publicClient.waitForTransactionReceipt({ hash });

      setInfoMsg("Campaign created successfully!");

      setTitle("");
      setDescription("");
      setGoal("0");
      setDurationDays(1);
      setMediaUrl("");
      setProjectLink("");
    } catch (err: any) {
      setErrorMsg(prettifyError(err));
    }
  }

  const inputBase =
    "w-full mt-1 p-2.5 rounded-xl bg-white/5 border border-white/10 outline-none " +
    "focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/15 transition";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/7 to-black/25 p-6">
      <div className="pointer-events-none absolute -top-28 -left-24 h-72 w-72 rounded-full bg-purple-500/18 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-24 h-72 w-72 rounded-full bg-fuchsia-500/12 blur-3xl" />

      <div className="flex flex-col lg:flex-row gap-6 relative">
        {/* FORM */}
        <div className="flex-1 rounded-3xl border border-white/10 bg-white/5 p-6 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-purple-500/18 blur-3xl" />

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                <Sparkles className="w-3.5 h-3.5" />
                Create on-chain campaign
              </div>
              <h2 className="text-2xl font-bold mt-3">Create Campaign</h2>
              <p className="text-sm text-white/60 mt-1">
                All campaign data is stored on-chain for transparency.
              </p>
            </div>

            <div className="text-xs text-white/50">
              {chain?.name ? (
                <>
                  Network: <span className="text-white/70">{chain.name}</span>
                </>
              ) : (
                <>Network: <span className="text-white/70">Not selected</span></>
              )}
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 text-white mt-6">
            <div>
              <label className="block text-sm text-white/70">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputBase} />
            </div>

            <div>
              <label className="block text-sm text-white/70">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputBase + " min-h-[110px] resize-y"}
              />
            </div>

            <div>
              <label className="block text-sm text-white/70">Media URL (image or YouTube)</label>
              <input
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className={inputBase}
                placeholder="https://..."
              />
              <p className="text-xs text-white/45 mt-1">Saved on-chain as metadata (string).</p>
            </div>

            <div>
              <label className="block text-sm text-white/70">Project link (GitHub / Website)</label>
              <input
                value={projectLink}
                onChange={(e) => setProjectLink(e.target.value)}
                className={inputBase}
                placeholder="https://..."
              />
              <p className="text-xs text-white/45 mt-1">Saved on-chain as metadata (string).</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-white/70">Goal (ETH)</label>
                <input
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className={inputBase}
                  type="number"
                  min="0"
                  step="0.001"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70">Duration (days)</label>
                <input
                  type="number"
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className={inputBase}
                  min="1"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="text-red-200 text-sm bg-red-950/35 border border-red-800/60 rounded-xl px-3 py-2 flex items-start gap-2">
                <CircleX className="w-4 h-4 mt-0.5" />
                <div>{errorMsg}</div>
              </div>
            )}

            {infoMsg && (
              <div className="text-purple-100 text-sm bg-purple-950/25 border border-purple-700/30 rounded-xl px-3 py-2 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5" />
                <div>{infoMsg}</div>
              </div>
            )}

            {txHash && (
              <div className="text-green-200 text-sm bg-green-950/25 border border-green-800/40 rounded-xl px-3 py-2 break-all flex items-start gap-2">
                <CircleCheck className="w-4 h-4 mt-0.5" />
                <div>
                  Transaction: <span className="text-green-100">{txHash}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 transition shadow-[0_0_22px_rgba(139,92,246,0.25)]"
              >
                {isPending ? "Creating..." : "Create"}
              </button>

              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* TIPS */}
        <aside className="w-full lg:w-[360px]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 relative overflow-hidden">
            <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-purple-500/18 blur-3xl" />
            <div className="text-sm font-semibold">Tips for a great campaign</div>
            <ul className="mt-3 text-sm text-white/70 space-y-2 list-disc pl-5">
              <li>Use a clear title (what you’re building + why it matters).</li>
              <li>Add a media link (image/YouTube) to improve trust.</li>
              <li>Set a realistic goal and deadline for your target audience.</li>
              <li>Include a GitHub/website link for credibility and verification.</li>
            </ul>
            <div className="mt-4 text-xs text-white/50">
              Note: campaigns may require admin approval before appearing publicly (depending on configuration).
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}