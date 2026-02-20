// frontend/src/pages/Admin.tsx
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

  // ---- admin checks ----
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

  // ---- load nextId ----
  const { data: nextId } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
    query: { refetchInterval: 2000 },
  }) as { data?: bigint };

  const count = Number(nextId ?? 0n);

  // ---- build read calls ----
  const calls = useMemo(() => {
    if (!count || count <= 0) return [];
    return Array.from({ length: count }, (_, id) => ({
      address: CROWDFUND_ADDRESS,
      abi: CROWDFUND_ABI as unknown as Abi,
      functionName: "getCampaign" as const,
      args: [BigInt(id)],
    }));
  }, [count]);

  // ---- batch read ----
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

  // ✅ LOGS (sem loop infinito)
  useEffect(() => {
    console.log("[Admin] env:", import.meta.env.VITE_CROWDFUND_ADDRESS);
    console.log("[Admin] const:", CROWDFUND_ADDRESS);
    console.log("[Admin] nextId:", nextId?.toString?.(), "count:", count);
    console.log("[Admin] calls:", calls);
    console.log("[Admin] data:", data);
    console.log("[Admin] rows:", rows);
    console.log("[Admin] existing:", existing);

    // extra: se o primeiro retorno falhar, mostra o erro
    if (data?.[0]?.status === "failure") {
      console.log("[Admin] getCampaign(0) failure:", data[0].error);
    }
    if (data?.[0]?.status === "success") {
      console.log("[Admin] getCampaign(0) raw:", data[0].result);
    }
  }, [nextId, count, calls, data, rows, existing]);

  // ---- actions ----
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

  // ---- tabs ----
  const TabBtn = ({ k, label }: { k: TabKey; label: string }) => (
    <button
      onClick={() => setTab(k)}
      className={
        "px-4 py-2 rounded-lg text-sm border " +
        (tab === k
          ? "bg-white/10 border-white/20 text-white"
          : "bg-transparent border-white/10 text-white/60 hover:text-white hover:bg-white/5")
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-white/60 text-sm">
            Review campaigns, manage reports, and place campaigns on hold.
          </p>
          <p className="text-white/40 text-xs mt-2">
            Contract: {CROWDFUND_ADDRESS} <br />
            nextId: {String(nextId ?? 0n)}
          </p>
        </div>

        <div className="flex gap-2">
          <TabBtn k="admin" label="Admin Panel" />
          <TabBtn k="finance" label="Finance Panel" />
        </div>
      </div>

      {errorMsg && (
        <div className="text-sm text-red-300 bg-red-950/40 border border-red-800 rounded px-3 py-2">
          {errorMsg}
        </div>
      )}
      {infoMsg && (
        <div className="text-sm text-green-300 bg-green-950/30 border border-green-800 rounded px-3 py-2 break-all">
          {infoMsg}
        </div>
      )}

      {tab === "admin" && (
        <div className="space-y-6">
          {/* Reported campaigns */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
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
                          className="px-3 py-1 rounded bg-white/10 hover:bg-white/15 border border-white/10 text-xs"
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

          {/* Approval queue */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Approval queue</h2>

            {!pending.length ? (
              <p className="text-white/60 text-sm">
                No pending campaigns. (Created: {count})
              </p>
            ) : (
              <table className="w-full text-sm border-separate border-spacing-y-2">
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
                      <td className="p-3">{c.held ? "Yes" : "—"}</td>
                      <td className="p-3 rounded-r-xl">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => setApproval(id, true)}
                            disabled={busyId === id || isPending}
                            className="px-3 py-1 rounded bg-green-600/70 hover:bg-green-600 disabled:opacity-60 text-xs"
                          >
                            {busyId === id ? "..." : "Approve"}
                          </button>

                          <button
                            onClick={() => setApproval(id, false)}
                            disabled={busyId === id || isPending}
                            className="px-3 py-1 rounded bg-red-600/70 hover:bg-red-600 disabled:opacity-60 text-xs"
                          >
                            {busyId === id ? "..." : "Reject"}
                          </button>

                          <button
                            onClick={() => toggleHeld(id, !c.held)}
                            disabled={busyId === id || isPending}
                            className="px-3 py-1 rounded bg-yellow-600/50 hover:bg-yellow-600/70 disabled:opacity-60 text-xs"
                          >
                            {busyId === id ? "..." : c.held ? "Release" : "Hold"}
                          </button>

                          <button
                            onClick={() => navigate(`/campaign/${id}`)}
                            className="px-3 py-1 rounded bg-white/10 hover:bg-white/15 border border-white/10 text-xs"
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
