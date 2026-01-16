// frontend/src/pages/Admin.tsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
} from "wagmi";
import type { Abi } from "abitype";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "../lib/contract";

type Campaign = {
  owner: `0x${string}`;
  title: string;
  description: string;
  goal: bigint;
  deadline: bigint;
  totalRaised: bigint;
  withdrawn: boolean;
  exists: boolean;
  media: string;
  approved: boolean;
  held: boolean;
  reports: bigint;
};

export default function Admin() {
  const { address, isConnected } = useAccount();

  const envAdmin = import.meta.env.VITE_ADMIN_ADDRESS?.toLowerCase() ?? null;

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

  if (!isAdmin) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-red-400 text-sm">
          Access denied. Only the platform admin can view this page.
        </p>
      </div>
    );
  }

  const { data: nextId } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
    query: { refetchInterval: 1500 },
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
    query: { refetchInterval: 1500 },
  });

  const rows =
    (data ?? [])
      .map((r, id) => (r.status === "success" ? { id, c: r.result as Campaign } : null))
      .filter(Boolean) as { id: number; c: Campaign }[];

  const reported = useMemo(
    () => rows.filter((x) => (x.c.reports ?? 0n) > 0n),
    [rows]
  );

  const { writeContractAsync } = useWriteContract();

  const [busyId, setBusyId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function setApproval(id: number, val: boolean) {
    setErrorMsg(null);

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
    } catch (err: any) {
      setErrorMsg(err?.shortMessage || err?.message || "Failed to approve/reject.");
    } finally {
      setBusyId(null);
    }
  }

  // #29 hold / release
  async function toggleHold(id: number, hold: boolean) {
    setErrorMsg(null);

    if (!isConnected || !address) {
      setErrorMsg("Connect your wallet as admin.");
      return;
    }

    setBusyId(id);
    try {
      await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "setHeld",
        args: [BigInt(id), hold],
      });
    } catch (err: any) {
      setErrorMsg(err?.shortMessage || err?.message || "Failed to set hold status.");
    } finally {
      setBusyId(null);
    }
  }

  if (!rows.length) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-white/60 text-sm">No campaigns created yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-white/60 text-sm">
            Review campaigns, manage reports, and place campaigns on hold.
          </p>
        </div>

        {/* #26 Finance page */}
        <Link
          to="/admin/finance"
          className="px-4 py-2 rounded bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
        >
          Financial Panel →
        </Link>
      </div>

      {errorMsg && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-700 rounded px-3 py-2">
          {errorMsg}
        </div>
      )}

      {/* #24 reported campaigns */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h2 className="text-lg font-semibold">Reported campaigns</h2>
        <p className="text-sm text-white/60 mt-1">
          Campaigns with at least 1 report.
        </p>

        {!reported.length ? (
          <p className="text-sm text-white/60 mt-3">No reported campaigns.</p>
        ) : (
          <table className="w-full text-sm border-separate border-spacing-y-2 mt-3">
            <thead>
              <tr className="text-white/60">
                <th className="text-left">#</th>
                <th className="text-left">Title</th>
                <th className="text-left">Reports</th>
                <th className="text-left">Hold</th>
                <th className="text-left">Open</th>
              </tr>
            </thead>
            <tbody>
              {reported.map(({ id, c }) => (
                <tr key={id} className="bg-black/20">
                  <td className="p-3 rounded-l-xl">#{id}</td>
                  <td className="p-3">{c.title}</td>
                  <td className="p-3">{Number(c.reports)}</td>
                  <td className="p-3">
                    {c.held ? (
                      <button
                        disabled={busyId === id}
                        onClick={() => toggleHold(id, false)}
                        className="px-3 py-1 rounded bg-green-600/70 hover:bg-green-600 disabled:opacity-60"
                      >
                        {busyId === id ? "..." : "Release"}
                      </button>
                    ) : (
                      <button
                        disabled={busyId === id}
                        onClick={() => toggleHold(id, true)}
                        className="px-3 py-1 rounded bg-yellow-600/70 hover:bg-yellow-600 disabled:opacity-60"
                      >
                        {busyId === id ? "..." : "Hold"}
                      </button>
                    )}
                  </td>
                  <td className="p-3 rounded-r-xl">
                    <Link
                      to={`/campaign/${id}`}
                      className="text-purple-300 hover:text-purple-200 underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* approval table */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Approval queue</h2>

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
            {rows.map(({ id, c }) => (
              <tr key={id} className="bg-white/5">
                <td className="p-3 rounded-l-xl">#{id}</td>
                <td className="p-3">{c.title}</td>
                <td className="p-3">{c.owner}</td>
                <td className="p-3">
                  {c.approved ? (
                    <span className="text-green-400">Approved</span>
                  ) : (
                    <span className="text-yellow-300">Pending</span>
                  )}
                </td>
                <td className="p-3">
                  {c.held ? (
                    <span className="text-yellow-300">Held</span>
                  ) : (
                    <span className="text-white/50">—</span>
                  )}
                </td>
                <td className="p-3 rounded-r-xl">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setApproval(id, true)}
                      disabled={busyId === id}
                      className="px-3 py-1 rounded bg-green-600/70 hover:bg-green-600 disabled:opacity-60"
                    >
                      {busyId === id ? "..." : "Approve"}
                    </button>
                    <button
                      onClick={() => setApproval(id, false)}
                      disabled={busyId === id}
                      className="px-3 py-1 rounded bg-red-600/70 hover:bg-red-600 disabled:opacity-60"
                    >
                      {busyId === id ? "..." : "Reject"}
                    </button>

                    {c.held ? (
                      <button
                        disabled={busyId === id}
                        onClick={() => toggleHold(id, false)}
                        className="px-3 py-1 rounded bg-green-600/30 hover:bg-green-600/40 disabled:opacity-60"
                      >
                        Release
                      </button>
                    ) : (
                      <button
                        disabled={busyId === id}
                        onClick={() => toggleHold(id, true)}
                        className="px-3 py-1 rounded bg-yellow-600/30 hover:bg-yellow-600/40 disabled:opacity-60"
                      >
                        Hold
                      </button>
                    )}

                    <Link
                      to={`/campaign/${id}`}
                      className="px-3 py-1 rounded bg-white/10 hover:bg-white/15 border border-white/10 text-xs"
                    >
                      Open
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
