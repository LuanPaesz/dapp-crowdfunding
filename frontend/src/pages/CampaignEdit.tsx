import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useReadContract, useSimulateContract, useWriteContract } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "../lib/contract";

type AbiFunctionLike = {
  type?: string;
  name?: string;
};

type CampaignRead = {
  title?: string;
  description?: string;
  goal?: bigint;
  deadline?: bigint;
};

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

  return "Failed to update.";
}

export default function CampaignEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const campaignId = useMemo(() => {
    if (!id) {
      return null;
    }

    try {
      const parsedId = BigInt(id);
      return parsedId >= 0n ? parsedId : null;
    } catch {
      return null;
    }
  }, [id]);

  const campaignIdValid = campaignId !== null;

  const hasUpdateFn = useMemo(() => {
    if (!Array.isArray(CROWDFUND_ABI)) {
      return false;
    }

    return (CROWDFUND_ABI as AbiFunctionLike[]).some(
      (item) => item?.type === "function" && item?.name === "updateCampaign"
    );
  }, []);

  const { data: raw } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "getCampaign",
    args: [campaignId ?? 0n],
    query: { enabled: campaignIdValid, refetchInterval: 1500 },
  });

  const campaign = raw as CampaignRead | undefined;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalEth, setGoalEth] = useState("0");
  const [deadline, setDeadline] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!campaign) {
      return;
    }

    setTitle(campaign.title ?? "");
    setDescription(campaign.description ?? "");

    try {
      const goalValue =
        typeof campaign.goal === "bigint"
          ? Number(formatUnits(campaign.goal, 18))
          : 0;

      setGoalEth(String(goalValue));
    } catch {
      setGoalEth("0");
    }

    setDeadline(campaign.deadline ? Number(campaign.deadline) : 0);
  }, [campaign]);

  const updateArgs = useMemo(() => {
    if (!campaignIdValid || campaignId === null) {
      return null;
    }

    try {
      const numericGoal = Number(goalEth);
      const parsedGoal =
        goalEth && numericGoal >= 0 ? parseUnits(goalEth, 18) : 0n;

      return [campaignId, title, description, parsedGoal, BigInt(deadline)] as const;
    } catch {
      return null;
    }
  }, [campaignIdValid, campaignId, title, description, goalEth, deadline]);

  const simulateEnabled =
    campaignIdValid &&
    hasUpdateFn &&
    updateArgs !== null &&
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    Number.isFinite(deadline) &&
    deadline > 0;

  const simulation = useSimulateContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "updateCampaign",
    args: updateArgs ?? [0n, "", "", 0n, 0n],
    query: { enabled: simulateEnabled },
  });

  const { writeContractAsync } = useWriteContract();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    if (!campaignIdValid) {
      setErrorMessage("Invalid campaign id.");
      setLoading(false);
      return;
    }

    if (!title.trim()) {
      setErrorMessage("Title is required.");
      setLoading(false);
      return;
    }

    if (!description.trim()) {
      setErrorMessage("Description is required.");
      setLoading(false);
      return;
    }

    if (Number(goalEth) < 0) {
      setErrorMessage("Goal must be >= 0.");
      setLoading(false);
      return;
    }

    if (!Number.isFinite(deadline) || deadline <= 0) {
      setErrorMessage("Deadline must be a unix timestamp (seconds) greater than now.");
      setLoading(false);
      return;
    }

    if (!hasUpdateFn) {
      const params = new URLSearchParams({
        title,
        description,
        goal: goalEth,
        deadline: String(deadline),
        fromEditId: id ?? "",
      });

      navigate(`/create?${params.toString()}`);
      setLoading(false);
      return;
    }

    try {
      const request = simulation.data?.request;

      if (!request) {
        throw new Error("Unable to prepare transaction.");
      }

      await writeContractAsync(request);
      setSuccessMessage("Campaign updated on-chain.");

      globalThis.setTimeout(() => {
        navigate(-1);
      }, 400);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  if (!campaignIdValid) {
    return <p>Invalid campaign id.</p>;
  }

  const submitLabel = loading
    ? "Saving..."
    : hasUpdateFn
      ? "Save"
      : "Recreate on Create";

  const noteContent = hasUpdateFn ? (
    <p className="mt-2 text-sm text-white/60">
      Note: this form calls <b>updateCampaign</b> if present on the ABI.
    </p>
  ) : (
    <p className="mt-2 text-sm text-yellow-300">
      Note: contract has no on-chain edit. You will be redirected to /create with
      the form prefilled to recreate the campaign.
    </p>
  );

  return (
    <div className="mx-auto max-w-2xl rounded-lg border border-[#333] bg-[#1a1a1a] p-8 shadow-lg">
      <h2 className="mb-4 text-2xl font-bold text-white">Edit Campaign #{id}</h2>

      {!campaign ? (
        <p className="text-white/70">Loading campaign data…</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4 text-white">
          <div>
            <label className="block text-sm text-gray-300">Title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 w-full rounded bg-gray-800 p-2 border border-gray-600 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300">Description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1 w-full rounded bg-gray-800 p-2 border border-gray-600 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300">Goal (ETH)</label>
            <input
              type="number"
              min="0"
              step="0.001"
              value={goalEth}
              onChange={(event) => setGoalEth(event.target.value)}
              className="mt-1 w-full rounded bg-gray-800 p-2 border border-gray-600 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300">
              Deadline (unix seconds)
            </label>
            <input
              type="number"
              value={deadline}
              onChange={(event) => setDeadline(Number(event.target.value))}
              className="mt-1 w-full rounded bg-gray-800 p-2 border border-gray-600 focus:border-purple-500"
            />
            <p className="mt-1 text-xs text-white/50">
              current: {deadline ? new Date(deadline * 1000).toLocaleString() : "—"}
            </p>
          </div>

          {errorMessage ? (
            <div className="rounded border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-400">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded border border-green-800 bg-green-950/30 px-3 py-2 text-sm text-green-400">
              {successMessage}
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-purple-600 px-4 py-2 hover:bg-purple-700 disabled:bg-purple-600/50"
            >
              {submitLabel}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded bg-gray-700 px-4 py-2 hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>

          {noteContent}
        </form>
      )}
    </div>
  );
}