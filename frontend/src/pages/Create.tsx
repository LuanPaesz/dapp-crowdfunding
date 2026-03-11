import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { CircleCheck, CircleX, Info, Sparkles } from "lucide-react";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "../lib/contract";

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "shortMessage" in error &&
    typeof error.shortMessage === "string"
  ) {
    return error.shortMessage;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "cause" in error &&
    typeof error.cause === "object" &&
    error.cause !== null &&
    "shortMessage" in error.cause &&
    typeof error.cause.shortMessage === "string"
  ) {
    return error.cause.shortMessage;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "details" in error &&
    typeof error.details === "string"
  ) {
    return error.details;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "cause" in error &&
    typeof error.cause === "object" &&
    error.cause !== null &&
    "details" in error.cause &&
    typeof error.cause.details === "string"
  ) {
    return error.cause.details;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Transaction failed.";
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
  const [durationDays, setDurationDays] = useState(1);
  const [mediaUrl, setMediaUrl] = useState("");
  const [projectLink, setProjectLink] = useState("");

  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    const presetTitle = params.get("title");
    const presetDescription = params.get("description");
    const presetGoal = params.get("goal");
    const presetDeadline = params.get("deadline");
    const presetMedia = params.get("media");
    const presetLink = params.get("externalLink");

    if (presetTitle) {
      setTitle(presetTitle);
    }

    if (presetDescription) {
      setDescription(presetDescription);
    }

    if (presetGoal) {
      setGoal(presetGoal);
    }

    if (presetMedia) {
      setMediaUrl(presetMedia);
    }

    if (presetLink) {
      setProjectLink(presetLink);
    }

    if (presetDeadline) {
      const deadlineNumber = Number(presetDeadline);

      if (!Number.isNaN(deadlineNumber) && deadlineNumber > 0) {
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const secondsRemaining = Math.max(0, deadlineNumber - nowInSeconds);
        const daysRemaining = Math.max(1, Math.ceil(secondsRemaining / (60 * 60 * 24)));
        setDurationDays(daysRemaining);
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

    if (!clean.title) {
      setErrorMsg("Title is required.");
      return;
    }

    if (!clean.description) {
      setErrorMsg("Description is required.");
      return;
    }

    let goalWei: bigint;

    try {
      goalWei = parseEther(goal);
    } catch {
      setErrorMsg("Goal must be a valid ETH number (e.g., 0.1).");
      return;
    }

    if (goalWei <= 0n) {
      setErrorMsg("Goal must be greater than 0.");
      return;
    }

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

    try {
      await publicClient.simulateContract({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "createCampaign",
        args,
        account: address,
      });
    } catch (simulationError) {
      setErrorMsg(`Simulation failed: ${getErrorMessage(simulationError)}`);
      return;
    }

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
    } catch (error) {
      setErrorMsg(getErrorMessage(error));
    }
  }

  const inputBase =
    "w-full mt-1 p-2.5 rounded-xl bg-white/5 border border-white/10 outline-none " +
    "focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/15 transition";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/7 to-black/25 p-6">
      <div className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-purple-500/18 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-24 h-72 w-72 rounded-full bg-fuchsia-500/12 blur-3xl" />

      <div className="relative flex flex-col gap-6 lg:flex-row">
        <div className="relative flex-1 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-purple-500/18 blur-3xl" />

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                <Sparkles className="h-3.5 w-3.5" />
                Create on-chain campaign
              </div>
              <h2 className="mt-3 text-2xl font-bold">Create Campaign</h2>
              <p className="mt-1 text-sm text-white/60">
                All campaign data is stored on-chain for transparency.
              </p>
            </div>

            <div className="text-xs text-white/50">
              {chain?.name ? (
                <>
                  Network: <span className="text-white/70">{chain.name}</span>
                </>
              ) : (
                <>
                  Network: <span className="text-white/70">Not selected</span>
                </>
              )}
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4 text-white">
            <div>
              <label className="block text-sm text-white/70">Title</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={inputBase}
              />
            </div>

            <div>
              <label className="block text-sm text-white/70">Description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={`${inputBase} min-h-[110px] resize-y`}
              />
            </div>

            <div>
              <label className="block text-sm text-white/70">
                Media URL (image or YouTube)
              </label>
              <input
                value={mediaUrl}
                onChange={(event) => setMediaUrl(event.target.value)}
                className={inputBase}
                placeholder="https://..."
              />
              <p className="mt-1 text-xs text-white/45">
                Saved on-chain as metadata (string).
              </p>
            </div>

            <div>
              <label className="block text-sm text-white/70">
                Project link (GitHub / Website)
              </label>
              <input
                value={projectLink}
                onChange={(event) => setProjectLink(event.target.value)}
                className={inputBase}
                placeholder="https://..."
              />
              <p className="mt-1 text-xs text-white/45">
                Saved on-chain as metadata (string).
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-white/70">Goal (ETH)</label>
                <input
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
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
                  onChange={(event) => setDurationDays(Number(event.target.value))}
                  className={inputBase}
                  min="1"
                />
              </div>
            </div>

            {errorMsg ? (
              <div className="flex items-start gap-2 rounded-xl border border-red-800/60 bg-red-950/35 px-3 py-2 text-sm text-red-200">
                <CircleX className="mt-0.5 h-4 w-4" />
                <div>{errorMsg}</div>
              </div>
            ) : null}

            {infoMsg ? (
              <div className="flex items-start gap-2 rounded-xl border border-purple-700/30 bg-purple-950/25 px-3 py-2 text-sm text-purple-100">
                <Info className="mt-0.5 h-4 w-4" />
                <div>{infoMsg}</div>
              </div>
            ) : null}

            {txHash ? (
              <div className="flex items-start gap-2 break-all rounded-xl border border-green-800/40 bg-green-950/25 px-3 py-2 text-sm text-green-200">
                <CircleCheck className="mt-0.5 h-4 w-4" />
                <div>
                  Transaction: <span className="text-green-100">{txHash}</span>
                </div>
              </div>
            ) : null}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-purple-600 px-4 py-2 transition shadow-[0_0_22px_rgba(139,92,246,0.25)] hover:bg-purple-700 disabled:bg-purple-600/50"
              >
                {isPending ? "Creating..." : "Create"}
              </button>

              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 transition hover:bg-white/15"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        <aside className="w-full lg:w-[360px]">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-purple-500/18 blur-3xl" />
            <div className="text-sm font-semibold">Tips for a great campaign</div>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/70">
              <li>Use a clear title (what you’re building + why it matters).</li>
              <li>Add a media link (image/YouTube) to improve trust.</li>
              <li>Set a realistic goal and deadline for your target audience.</li>
              <li>Include a GitHub/website link for credibility and verification.</li>
            </ul>
            <div className="mt-4 text-xs text-white/50">
              Note: campaigns may require admin approval before appearing publicly
              (depending on configuration).
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}