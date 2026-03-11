import { useMemo, useState } from "react";
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

type TabButtonProps = Readonly<{
  tabKey: TabKey;
  label: string;
  activeTab: TabKey;
  onSelect: (tab: TabKey) => void;
}>;

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

function TabButton({
  tabKey,
  label,
  activeTab,
  onSelect,
}: TabButtonProps) {
  const isActive = activeTab === tabKey;

  return (
    <button
      type="button"
      onClick={() => onSelect(tabKey)}
      className={
        "rounded-xl border px-4 py-2 text-sm transition " +
        (isActive
          ? "border-purple-500/25 bg-purple-500/15 text-white shadow-[0_0_18px_rgba(139,92,246,0.15)]"
          : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10 hover:text-white")
      }
    >
      {label}
    </button>
  );
}

function getCampaignRows(
  data: readonly unknown[] | undefined
): Array<{ id: number; c: Campaign }> {
  return (
    data?.flatMap((item, id) => {
      const result = item as { status?: string; result?: unknown } | undefined;

      if (result?.status !== "success") {
        return [];
      }

      return [{ id, c: result.result as Campaign }];
    }) ?? []
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

  const envAdmin = String(import.meta.env.VITE_ADMIN_ADDRESS ?? "").toLowerCase();

  const { data: contractAdmin } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "admin",
  });

  const adminAddress = (contractAdmin as `0x${string}` | undefined)?.toLowerCase();

  const isAdmin = useMemo(() => {
    const currentAddress = address?.toLowerCase();

    if (!currentAddress) {
      return false;
    }

    if (currentAddress === envAdmin) {
      return true;
    }

    return currentAddress === adminAddress;
  }, [address, adminAddress, envAdmin]);

  const { data: nextId } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
    query: { refetchInterval: 2000 },
  });

  const count = Number((nextId as bigint | undefined) ?? 0n);

  const calls = useMemo(() => {
    if (count <= 0) {
      return [];
    }

    return Array.from({ length: count }, (_, id) => ({
      address: CROWDFUND_ADDRESS,
      abi: CROWDFUND_ABI as Abi,
      functionName: "getCampaign" as const,
      args: [BigInt(id)],
    }));
  }, [count]);

  const { data } = useReadContracts({
    contracts: calls,
    allowFailure: true,
    query: { refetchInterval: 2000 },
  });

  const rows = useMemo(() => getCampaignRows(data), [data]);

  const existing = useMemo(
    () => rows.filter((row) => row.c.exists),
    [rows]
  );

  const reported = useMemo(
    () => existing.filter((row) => row.c.reports > 0n),
    [existing]
  );

  const pending = useMemo(
    () => existing.filter((row) => !row.c.approved),
    [existing]
  );

  async function setApproval(id: number, value: boolean) {
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
        args: [BigInt(id), value],
      });

      setInfoMsg(value ? `✅ Approved. Tx: ${hash}` : `✅ Rejected. Tx: ${hash}`);
    } catch (error) {
      setErrorMsg(getErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleHeld(id: number, nextHeldValue: boolean) {
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
        args: [BigInt(id), nextHeldValue],
      });

      setInfoMsg(
        nextHeldValue
          ? `✅ Placed on hold. Tx: ${hash}`
          : `✅ Released. Tx: ${hash}`
      );
    } catch (error) {
      setErrorMsg(getErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  if (!isAdmin) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-sm text-red-400">
          Access denied. Only the platform admin can view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-purple-500/14 via-white/6 to-black/25 p-6">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-purple-500/22 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-fuchsia-500/12 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Admin</h1>
            <p className="text-sm text-white/65">
              Review campaigns, manage reports, and place campaigns on hold.
            </p>
          </div>

          <div className="flex gap-2">
            <TabButton
              tabKey="admin"
              label="Admin Panel"
              activeTab={tab}
              onSelect={setTab}
            />
            <TabButton
              tabKey="finance"
              label="Finance Panel"
              activeTab={tab}
              onSelect={setTab}
            />
          </div>
        </div>
      </div>

      {errorMsg ? (
        <div className="rounded-xl border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {errorMsg}
        </div>
      ) : null}

      {infoMsg ? (
        <div className="break-all rounded-xl border border-green-800/60 bg-green-950/30 px-3 py-2 text-sm text-green-300">
          {infoMsg}
        </div>
      ) : null}

      {tab === "admin" ? (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-purple-500/10 via-white/6 to-black/25 p-5">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-purple-500/18 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

            <h2 className="text-lg font-semibold">Reported campaigns</h2>
            <p className="mb-3 text-sm text-white/60">
              Campaigns with at least 1 report.
            </p>

            {reported.length === 0 ? (
              <p className="text-sm text-white/50">No reported campaigns.</p>
            ) : (
              <table className="w-full border-separate border-spacing-y-2 text-sm">
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
                      <td className="rounded-l-xl p-3">#{id}</td>
                      <td className="p-3">{c.title}</td>
                      <td className="p-3">{Number(c.reports)}</td>
                      <td className="rounded-r-xl p-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/campaign/${id}`)}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs hover:bg-white/10"
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

          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-purple-500/10 via-white/6 to-black/25 p-5">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-purple-500/18 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Approval queue</h2>
                <p className="text-sm text-white/60">
                  Pending campaigns require approval before appearing publicly.
                </p>
              </div>
              <div className="text-xs text-white/50">
                Created campaigns: {count}
              </div>
            </div>

            {pending.length === 0 ? (
              <p className="mt-3 text-sm text-white/60">No pending campaigns.</p>
            ) : (
              <table className="mt-3 w-full border-separate border-spacing-y-2 text-sm">
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
                  {pending.map(({ id, c }) => {
                    const holdActionLabel = c.held ? "Release" : "Hold";
                    const holdNextValue = !c.held;

                    return (
                      <tr key={id} className="bg-white/5">
                        <td className="rounded-l-xl p-3">#{id}</td>
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
                          {c.held ? (
                            <span className="text-yellow-300">Yes</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="rounded-r-xl p-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setApproval(id, true)}
                              disabled={busyId === id || isPending}
                              className="rounded-lg bg-green-600/70 px-3 py-1 text-xs hover:bg-green-600 disabled:opacity-60"
                            >
                              {busyId === id ? "..." : "Approve"}
                            </button>

                            <button
                              type="button"
                              onClick={() => setApproval(id, false)}
                              disabled={busyId === id || isPending}
                              className="rounded-lg bg-red-600/70 px-3 py-1 text-xs hover:bg-red-600 disabled:opacity-60"
                            >
                              {busyId === id ? "..." : "Reject"}
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleHeld(id, holdNextValue)}
                              disabled={busyId === id || isPending}
                              className="rounded-lg bg-yellow-600/50 px-3 py-1 text-xs hover:bg-yellow-600/70 disabled:opacity-60"
                            >
                              {busyId === id ? "..." : holdActionLabel}
                            </button>

                            <button
                              type="button"
                              onClick={() => navigate(`/campaign/${id}`)}
                              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs hover:bg-white/10"
                            >
                              Open
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <AdminFinance />
      )}
    </div>
  );
}