// frontend/src/pages/Admin.tsx
import { useMemo, useState } from "react";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
} from "wagmi";
import type { Abi } from "abitype";
import { useNavigate } from "react-router-dom";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "../lib/contract";
import AdminFinance from "../components/AdminFinance";

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

type TabKey = "admin" | "finance";

export default function Admin() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // ---- admin checks ----
  const envAdmin = import.meta.env.VITE_ADMIN_ADDRESS?.toLowerCase?.() ?? null;

  const { data: contractAdmin } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "admin",
  }) as { data?: string };

  const lowerAddr = address?.toLowerCase();
  const onChainAdmin = contractAdmin?.toLowerCase();

  const isAdmin =
    !!lowerAddr &&
    (lowerAddr === envAdmin || (onChainAdmin && lowerAddr === onChainAdmin));

  const [tab, setTab] = useState<TabKey>("admin");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

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

  // ---- load campaigns ----
  const { data: nextId } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
    query: { refetchInterval: 2000 },
  }) as { data?: bigint };

  const count = Number(nextId ?? 0n);

  const calls =
    count > 0
      ? Array.from({ length: count }, (_, id) => ({
          address: CROWDFUND_ADDRESS,
          abi: CROWDFUND_ABI as unknown as Abi,
          functionName: "getCampaign" as const,
          args: [BigInt(id)],
        }))
      : [];

  const { data } = useReadContracts({
    contracts: calls,
    allowFailure: true,
    query: { refetchInterval: 2000 },
  });

  const rows: { id: number; c: Campaign }[] =
    (data ?? [])
      .map((r, id) =>
        r.status === "success" ? { id, c: r.result as Campaign } : null
      )
      .filter(Boolean) as { id: number; c: Campaign }[];

  const existing = useMemo(
    () => rows.filter((x) => x.c?.exists),
    [rows]
  );

  const reported = useMemo(
    () => existing.filter((x) => (x.c.reports ?? 0n) > 0n),
    [existing]
  );

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
      await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "approveCampaign",
        args: [BigInt(id), val],
      });
      setInfoMsg(val ? "✅ Campaign approved." : "✅ Campaign rejected.");
    } catch (err: any) {
      setErrorMsg(
        err?.shortMessage ||
          err?.message ||
          "Failed to send approve/reject transaction."
      );
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
      await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "setHeld",
        args: [BigInt(id), next],
      });
      setInfoMsg(next ? "✅ Campaign placed on hold." : "✅ Campaign released.");
    } catch (err: any) {
      setErrorMsg(err?.shortMessage || err?.message || "Failed to toggle hold.");
    } finally {
      setBusyId(null);
    }
  }

  // ---- UI helpers ----
  const TabBtn = ({
    k,
    label,
  }: {
    k: TabKey;
    label: string;
  }) => (
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

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-white/60 text-sm">
            Review campaigns, manage reports, and place campaigns on hold.
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
        <div className="text-sm text-green-300 bg-green-950/30 border border-green-800 rounded px-3 py-2">
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

            {!existing.length ? (
              <p className="text-white/60 text-sm">No campaigns created yet.</p>
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
                  {existing.map(({ id, c }) => (
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
                            disabled={busyId === id}
                            className="px-3 py-1 rounded bg-green-600/70 hover:bg-green-600 disabled:opacity-60 text-xs"
                          >
                            {busyId === id ? "..." : "Approve"}
                          </button>
                          <button
                            onClick={() => setApproval(id, false)}
                            disabled={busyId === id}
                            className="px-3 py-1 rounded bg-red-600/70 hover:bg-red-600 disabled:opacity-60 text-xs"
                          >
                            {busyId === id ? "..." : "Reject"}
                          </button>

                          <button
                            onClick={() => toggleHeld(id, !c.held)}
                            disabled={busyId === id}
                            className="px-3 py-1 rounded bg-yellow-600/50 hover:bg-yellow-600/70 disabled:opacity-60 text-xs"
                          >
                            {busyId === id
                              ? "..."
                              : c.held
                              ? "Release"
                              : "Hold"}
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
