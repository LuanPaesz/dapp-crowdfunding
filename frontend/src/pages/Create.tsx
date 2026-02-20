// frontend/src/pages/Create.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { parseEther } from "viem";
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

    console.log("[Create] submit ✅");
    console.log("[Create] connected:", isConnected, "address:", address, "chain:", chain?.id);

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

    // contract expects 6 args:
    // (title, description, media, projectLink, goalWei, durationDays)
    const args = [
      clean.title,
      clean.description,
      clean.media,
      clean.link,
      goalWei,
      BigInt(clean.duration),
    ] as const;

    console.log("[Create] contract:", CROWDFUND_ADDRESS);
    console.log("[Create] args:", args);

    // 1) SIMULATE
    try {
      await publicClient.simulateContract({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "createCampaign",
        args,
        account: address,
      });
      console.log("[Create] simulate OK ✅");
    } catch (simErr: any) {
      console.log("[Create] simulate ERROR:", simErr);
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
        // gas manual ajuda em hardhat remoto
        gas: 1_500_000n,
      });

      setTxHash(hash);
      setInfoMsg("⛏️ Transaction sent. Waiting for confirmation...");

      // ✅ importante: espera minerar para evitar “campanha fantasma” no UI
      await publicClient.waitForTransactionReceipt({ hash });

      setInfoMsg("✅ Campaign created successfully!");

      setTitle("");
      setDescription("");
      setGoal("0");
      setDurationDays(1);
      setMediaUrl("");
      setProjectLink("");
    } catch (err: any) {
      console.log("[Create] WRITE ERROR:", err);
      setErrorMsg(prettifyError(err));
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-[#1a1a1a] border border-[#333] rounded-lg p-8 shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-white">Create Campaign</h2>

      <form onSubmit={onSubmit} className="space-y-4 text-white">
        <div>
          <label className="block text-sm text-gray-300">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mt-1 p-2 rounded bg-gray-800 border border-gray-600 focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full mt-1 p-2 rounded bg-gray-800 border border-gray-600 focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300">Media URL (image or video)</label>
          <input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            className="w-full mt-1 p-2 rounded bg-gray-800 border border-gray-600 focus:border-purple-500"
            placeholder="https://..."
          />
          <p className="text-xs text-gray-400 mt-1">Stored on-chain as metadata (string).</p>
        </div>

        <div>
          <label className="block text-sm text-gray-300">Project link (GitHub / Website)</label>
          <input
            value={projectLink}
            onChange={(e) => setProjectLink(e.target.value)}
            className="w-full mt-1 p-2 rounded bg-gray-800 border border-gray-600 focus:border-purple-500"
            placeholder="https://..."
          />
          <p className="text-xs text-gray-400 mt-1">Stored on-chain as metadata (string).</p>
        </div>

        <div>
          <label className="block text-sm text-gray-300">Goal (ETH)</label>
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full mt-1 p-2 rounded bg-gray-800 border border-gray-600 focus:border-purple-500"
            type="number"
            min="0"
            step="0.001"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300">Duration (days)</label>
          <input
            type="number"
            value={durationDays}
            onChange={(e) => setDurationDays(Number(e.target.value))}
            className="w-full mt-1 p-2 rounded bg-gray-800 border border-gray-600 focus:border-purple-500"
            min="1"
          />
        </div>

        {errorMsg && (
          <div className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded px-3 py-2">
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div className="text-blue-200 text-sm bg-blue-950/30 border border-blue-800 rounded px-3 py-2">
            {infoMsg}
          </div>
        )}

        {txHash && (
          <div className="text-green-400 text-sm bg-green-950/30 border border-green-800 rounded px-3 py-2 break-all">
            ✅ Transaction: {txHash}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50"
          >
            {isPending ? "Creating..." : "Create"}
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
