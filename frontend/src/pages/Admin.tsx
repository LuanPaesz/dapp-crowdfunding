import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
} from "wagmi";
import type { Abi } from "abitype";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "../lib/contract";
import AdminFinance from "../components/AdminFinance";

type Campaign = {
  owner: `0x${string}`;
  title: string;
  description: string;
  media?: string;
  projectLink?: string;
  goal: bigint;
  deadline: bigint;
  totalRaised: bigint;
  withdrawn: boolean;
  exists: boolean;
  approved: boolean;
  held: boolean;
  reports: bigint;
};

type TabKey = "admin" | "finance";

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

export default function Admin() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const [tab, setTab] = useState<TabKey>("admin");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const envAdmin = (import.meta.env.VITE_ADMIN_ADDRESS || "").toLowerCase();

  const { data: contractAdmin } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "admin",
  }) as { data?: `0x${string}` };

  const isAdmin = useMemo(() => {
    const me = address?.toLowerCase();
    const onchain = contractAdmin?.toLowerCase();
    if (!me) return false;
    return me === envAdmin || (!!onchain && me === onchain);
  }, [address, contractAdmin, envAdmin]);

  const { data: nextId } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
    query: { refetchInterval: 2000 },
  }) as { data?: bigint };

  const count = Number(nextId ?? 0n);

  const calls = useMemo(() => {
    if (!count || count <= 0) return [];
    return Array.from({ length: count }, (_, id) => ({
      address: CROWDFUND_ADDRESS,
      abi: CROWDFUND_ABI as unknown as Abi,
      functionName: "getCampaign" as const,
      args: [BigInt(id)],
    }));
  }, [count]);

  const { data } = useReadContracts({
    contracts: calls,
    allowFailure: true,
    query: { refetchInterval: 2000 },
  });

  const rows: { id: number; c: Campaign }[] = useMemo(() => {
    return (data ?? [])
      .map((r, id) =>
        r && r.status === "success" ? { id, c: r.result as Campaign } : null
      )
      .filter(Boolean) as { id: number; c: Campaign }[];
  }, [data]);

  const existing = useMemo(() => rows.filter((x) => x.c?.exists), [rows]);

  const reported = useMemo(
    () => existing.filter((x) => (x.c.reports ?? 0n) > 0n),
    [existing]
  );

  const pending = useMemo(
    () => existing.filter((x) => !x.c.approved),
    [existing]
  );

  useEffect(() => {
    // Debug only (no UI exposure)
    console.log("[Admin] nextId:", nextId?.toString?.(), "count:", count);
  }, [nextId, count]);

  async function setApproval(id: number, val: boolean) {
    setErrorMsg(null);
    setInfoMsg(null);

    if (!isConnected || !address) {
      setErrorMsg("Connect your wallet as admin to approve campaigns.");
      return;
    }

    setBusyId(id);
    try {
      const hash = await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "approveCampaign",
        args: [BigInt(id), val],
      });
      setInfoMsg(val ? `✅ Approved. Tx: ${hash}` : `✅ Rejected. Tx: ${hash}`);
    } catch (err: any) {
      setErrorMsg(prettifyError(err));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleHeld(id: number, next: boolean) {
    setErrorMsg(null);
    setInfoMsg(null);

    if (!isConnected || !address) {
      setErrorMsg("Connect your wallet as admin to hold/release campaigns.");
      return;
    }

    setBusyId(id);
    try {
      const hash = await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "setHeld",
        args: [BigInt(id), next],
      });
      setInfoMsg(
        next ? `✅ Placed on hold. Tx: ${hash}` : `✅ Released. Tx: ${hash}`
      );
    } catch (err: any) {
      setErrorMsg(prettifyError(err));
    } finally {
      setBusyId(null);
    }
  }

  const TabBtn = ({ k, label }: { k: TabKey; label: string }) => (
    <button
      onClick={() => setTab(k)}
      className={
        "px-4 py-2 rounded-xl text-sm border transition " +
        (tab === k
          ? "bg-purple-500/15 border-purple-500/25 text-white shadow-[0_0_18px_rgba(139,92,246,0.15)]"
          : "bg-white/5 border-white/10 text-white/65 hover:text-white hover:bg-white/10")
      }
    >
      {label}
    </button>
  );

  if (!isAdmin) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-red-400 text-sm">
          Access denied. Only the platform admin can view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* HEADER (purple life) */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-purple-500/14 via-white/6 to-black/25 p-6">
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-purple-500/22 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-fuchsia-500/12 blur-3xl" />

        <div className="flex items-start justify-between gap-4 flex-wrap relative">
          <div>
            <h1 className="text-2xl font-bold">Admin</h1>
            <p className="text-white/65 text-sm">
              Review campaigns, manage reports, and place campaigns on hold.
            </p>
            {/* ✅ Do NOT show contract / nextId in the UI */}
          </div>

          <div className="flex gap-2">
            <TabBtn k="admin" label="Admin Panel" />
            <TabBtn k="finance" label="Finance Panel" />
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="text-sm text-red-300 bg-red-950/40 border border-red-800/60 rounded-xl px-3 py-2">
          {errorMsg}
        </div>
      )}
      {infoMsg && (
        <div className="text-sm text-green-300 bg-green-950/30 border border-green-800/60 rounded-xl px-3 py-2 break-all">
          {infoMsg}
        </div>
      )}

      {tab === "admin" && (
        <div className="space-y-6">
          {/* Reported campaigns (add purple life like your screenshot) */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-purple-500/10 via-white/6 to-black/25 p-5">
            <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-purple-500/18 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

            <h2 className="text-lg font-semibold">Reported campaigns</h2>
            <p className="text-sm text-white/60 mb-3">
              Campaigns with at least 1 report.
            </p>

            {!reported.length ? (
              <p className="text-sm text-white/50">No reported campaigns.</p>
            ) : (
              <table className="w-full text-sm border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-white/60">
                    <th className="text-left">#</th>
                    <th className="text-left">Title</th>
                    <th className="text-left">Reports</th>
                    <th className="text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reported.map(({ id, c }) => (
                    <tr key={id} className="bg-white/5">
                      <td className="p-3 rounded-l-xl">#{id}</td>
                      <td className="p-3">{c.title}</td>
                      <td className="p-3">{Number(c.reports)}</td>
                      <td className="p-3 rounded-r-xl">
                        <button
                          onClick={() => navigate(`/campaign/${id}`)}
                          className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Approval queue (already has purple in your screenshot; keep consistent) */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-purple-500/10 via-white/6 to-black/25 p-5">
            <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-purple-500/18 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-semibold">Approval queue</h2>
                <p className="text-sm text-white/60">
                  Pending campaigns require approval before appearing publicly.
                </p>
              </div>
              <div className="text-xs text-white/50">Created campaigns: {count}</div>
            </div>

            {!pending.length ? (
              <p className="text-white/60 text-sm mt-3">No pending campaigns.</p>
            ) : (
              <table className="w-full text-sm border-separate border-spacing-y-2 mt-3">
                <thead>
                  <tr className="text-white/60">
                    <th className="text-left">#</th>
                    <th className="text-left">Title</th>
                    <th className="text-left">Owner</th>
                    <th className="text-left">Approved</th>
                    <th className="text-left">Held</th>
                    <th className="text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map(({ id, c }) => (
                    <tr key={id} className="bg-white/5">
                      <td className="p-3 rounded-l-xl">#{id}</td>
                      <td className="p-3">{c.title}</td>
                      <td className="p-3">{c.owner}</td>
                      <td className="p-3">
                        {c.approved ? (
                          <span className="text-green-300">Approved</span>
                        ) : (
                          <span className="text-yellow-300">Pending</span>
                        )}
                      </td>
                      <td className="p-3">
                        {c.held ? <span className="text-yellow-300">Yes</span> : "—"}
                      </td>
                      <td className="p-3 rounded-r-xl">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => setApproval(id, true)}
                            disabled={busyId === id || isPending}
                            className="px-3 py-1 rounded-lg bg-green-600/70 hover:bg-green-600 disabled:opacity-60 text-xs"
                          >
                            {busyId === id ? "..." : "Approve"}
                          </button>

                          <button
                            onClick={() => setApproval(id, false)}
                            disabled={busyId === id || isPending}
                            className="px-3 py-1 rounded-lg bg-red-600/70 hover:bg-red-600 disabled:opacity-60 text-xs"
                          >
                            {busyId === id ? "..." : "Reject"}
                          </button>

                          <button
                            onClick={() => toggleHeld(id, !c.held)}
                            disabled={busyId === id || isPending}
                            className="px-3 py-1 rounded-lg bg-yellow-600/50 hover:bg-yellow-600/70 disabled:opacity-60 text-xs"
                          >
                            {busyId === id ? "..." : c.held ? "Release" : "Hold"}
                          </button>

                          <button
                            onClick={() => navigate(`/campaign/${id}`)}
                            className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs"
                          >
                            Open
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === "finance" && <AdminFinance />}
    </div>
  );
}