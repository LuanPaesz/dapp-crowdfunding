// frontend/src/pages/Create.tsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAccount, useWriteContract } from "wagmi";
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
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("0");
  const [durationDays, setDurationDays] = useState<number>(1);
  const [mediaUrl, setMediaUrl] = useState("");
  const [projectLink, setProjectLink] = useState("");

  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setTxHash(null);

    if (!isConnected || !address) {
      setErrorMsg("Please connect your wallet first.");
      return;
    }
    if (!title.trim()) {
      setErrorMsg("Title is required.");
      return;
    }
    if (!description.trim()) {
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

    const daysNum = Number(durationDays);
    if (!Number.isFinite(daysNum) || daysNum < 1) {
      setErrorMsg("Duration must be at least 1 day.");
      return;
    }

    try {
      const hash = await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "createCampaign",
        args: [
          title.trim(),
          description.trim(),
          mediaUrl.trim(),
          projectLink.trim(),
          goalWei,
          BigInt(daysNum),
        ],
      });

      setTxHash(hash);

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
          <label className="block text-sm text-gray-300">
            Media URL (image or video)
          </label>
          <input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            className="w-full mt-1 p-2 rounded bg-gray-800 border border-gray-600 focus:border-purple-500"
            placeholder="https://example.com/image.png"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300">
            Project link (GitHub / Website)
          </label>
          <input
            value={projectLink}
            onChange={(e) => setProjectLink(e.target.value)}
            className="w-full mt-1 p-2 rounded bg-gray-800 border border-gray-600 focus:border-purple-500"
            placeholder="https://github.com/..."
          />
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

        {txHash && (
          <div className="text-green-400 text-sm bg-green-950/30 border border-green-800 rounded px-3 py-2 break-all">
            ✅ Transaction sent: {txHash}
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
