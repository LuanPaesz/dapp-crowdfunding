// frontend/src/pages/Admin.tsx
import { useState } from "react";
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

  // admin from .env
  const envAdmin =
    import.meta.env.VITE_ADMIN_ADDRESS?.toLowerCase() ?? null;

  // admin from contract
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

  // se não for admin, bloqueia a página
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
  });

  const rows =
    (data ?? [])
      .map((r, id) =>
        r.status === "success" ? { id, c: r.result as Campaign } : null
      )
      .filter(Boolean) as { id: number; c: Campaign }[];

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
    console.log("Calling approveCampaign on id", id, "val", val);

    try {
      const tx = await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "approveCampaign",
        args: [BigInt(id), val],
      });

      console.log("approveCampaign tx hash:", tx);
    } catch (err: any) {
      console.error("approveCampaign error:", err);
      setErrorMsg(
        err?.shortMessage ||
          err?.message ||
          "Failed to send approve/reject transaction."
      );
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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <p className="text-white/60 text-sm">
        Review campaigns and approve or reject them before they receive funds.
      </p>

      {errorMsg && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-700 rounded px-3 py-2">
          {errorMsg}
        </div>
      )}

      <table className="w-full text-sm border-separate border-spacing-y-2">
        <thead>
          <tr className="text-white/60">
            <th className="text-left">#</th>
            <th className="text-left">Title</th>
            <th className="text-left">Owner</th>
            <th className="text-left">Approved</th>
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
              <td className="p-3 rounded-r-xl">
                <div className="flex gap-2">
                  <button
                    onClick={() => setApproval(id, true)}
                    disabled={busyId === id}
                    className="px-3 py-1 rounded bg-green-600/70 hover:bg-green-600 disabled:opacity-60"
                  >
                    {busyId === id ? "Approving..." : "Approve"}
                  </button>
                  <button
                    onClick={() => setApproval(id, false)}
                    disabled={busyId === id}
                    className="px-3 py-1 rounded bg-red-600/70 hover:bg-red-600 disabled:opacity-60"
                  >
                    {busyId === id ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
