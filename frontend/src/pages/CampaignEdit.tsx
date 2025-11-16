import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useReadContract,
  useSimulateContract,
  useWriteContract,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "../lib/contract";

export default function CampaignEdit() {
  // read :id from the route
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // guard invalid id
  if (!id) return <p>Invalid campaign id.</p>;
  const campaignId = (() => {
    try {
      return BigInt(id);
    } catch {
      return 0n;
    }
  })();

  // check if the ABI exposes an "updateCampaign" function
  const hasUpdateFn = useMemo(
    () =>
      Array.isArray(CROWDFUND_ABI) &&
      CROWDFUND_ABI.some(
        (f: any) => f?.type === "function" && f?.name === "updateCampaign",
      ),
    [],
  );

  // read on-chain campaign data
  const { data: raw } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "getCampaign",
    args: [campaignId],
    // optional polling to keep UI fresh
    query: { refetchInterval: 1500 },
  }) as { data?: any };

  // local form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalEth, setGoalEth] = useState("0");
  const [deadline, setDeadline] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // hydrate form when on-chain data arrives
  useEffect(() => {
    if (!raw) return;
    setTitle(raw.title ?? "");
    setDescription(raw.description ?? "");
    try {
      const g =
        typeof raw.goal === "bigint"
          ? Number(formatUnits(raw.goal as bigint, 18))
          : 0;
      setGoalEth(String(g));
    } catch {
      setGoalEth("0");
    }
    setDeadline(raw.deadline ? Number(raw.deadline) : 0);
  }, [raw]);

  // pre-build arguments for update (when available)
  const updateArgs = useMemo(() => {
    try {
      const parsedGoal =
        goalEth && Number(goalEth) > 0 ? parseUnits(goalEth, 18) : 0n;
      return [campaignId, title, description, parsedGoal, BigInt(deadline)] as const;
    } catch {
      return undefined;
    }
  }, [campaignId, title, description, goalEth, deadline]);

  // prepare transaction only if update fn exists
  const simulate = hasUpdateFn
    ? (useSimulateContract as any)({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "updateCampaign",
        args: updateArgs,
        query: {
          enabled:
            !!updateArgs &&
            title.trim().length > 0 &&
            description.trim().length > 0,
        },
      })
    : { data: undefined };

  const { writeContractAsync } = useWriteContract();

  // submit handler (edit or fallback to recreate)
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setLoading(true);

    // basic validations
    if (!title.trim()) {
      setErr("Title is required.");
      setLoading(false);
      return;
    }
    if (!description.trim()) {
      setErr("Description is required.");
      setLoading(false);
      return;
    }
    if (Number(goalEth) < 0) {
      setErr("Goal must be >= 0.");
      setLoading(false);
      return;
    }
    if (!Number.isFinite(deadline) || deadline <= 0) {
      setErr("Deadline must be a unix timestamp (seconds) greater than now.");
      setLoading(false);
      return;
    }

    // if contract does not expose updateCampaign, redirect to /create with prefilled data
    if (!hasUpdateFn) {
      const params = new URLSearchParams({
        title,
        description,
        goal: goalEth,
        deadline: String(deadline),
        fromEditId: String(id ?? ""),
      });
      navigate(`/create?${params.toString()}`);
      setLoading(false);
      return;
    }

    // try on-chain update using prepare/simulate result
    try {
      const req = simulate?.data?.request;
      if (!req) throw new Error("Unable to prepare transaction.");
      await writeContractAsync(req);
      setOk("Campaign updated on-chain.");
      // go back to previous page or details
      setTimeout(() => navigate(-1), 400);
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || "Failed to update.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-[#1a1a1a] border border-[#333] rounded-lg p-8 shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-white">Edit Campaign #{id}</h2>

      {!raw ? (
        <p className="text-white/70">Loading campaign data…</p>
      ) : (
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
            <label className="block text-sm text-gray-300">Goal (ETH)</label>
            <input
              type="number"
              min="0"
              step="0.001"
              value={goalEth}
              onChange={(e) => setGoalEth(e.target.value)}
              className="w-full mt-1 p-2 rounded bg-gray-800 border border-gray-600 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300">
              Deadline (unix seconds)
            </label>
            <input
              type="number"
              value={deadline}
              onChange={(e) => setDeadline(Number(e.target.value))}
              className="w-full mt-1 p-2 rounded bg-gray-800 border border-gray-600 focus:border-purple-500"
            />
            <p className="text-xs text-white/50 mt-1">
              current:{" "}
              {deadline ? new Date(deadline * 1000).toLocaleString() : "—"}
            </p>
          </div>

          {err && (
            <div className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded px-3 py-2">
              {err}
            </div>
          )}
          {ok && (
            <div className="text-green-400 text-sm bg-green-950/30 border border-green-800 rounded px-3 py-2">
              {ok}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50"
            >
              {loading
                ? "Saving..."
                : hasUpdateFn
                ? "Save"
                : "Recreate on Create"}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>

          {!hasUpdateFn ? (
            <p className="text-sm text-yellow-300 mt-2">
              Note: contract has no on-chain edit. You will be redirected to
              /create with the form prefilled to recreate the campaign.
            </p>
          ) : (
            <p className="text-sm text-white/60 mt-2">
              Note: this form calls <b>updateCampaign</b> if present on the ABI.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
