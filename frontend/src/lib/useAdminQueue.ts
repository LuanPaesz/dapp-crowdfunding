// frontend/src/lib/useAdminQueue.ts
import { useEffect, useMemo, useState } from "react";
import { usePublicClient } from "wagmi";
import type { PublicClient } from "viem";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "./contract";

export type Campaign = {
  owner: `0x${string}`;
  title: string;
  description: string;
  goal: bigint;
  deadline: bigint;
  totalRaised: bigint;
  withdrawn: boolean;
  exists: boolean;

  // se seu struct tem isso:
  media?: string;
  projectLink?: string;

  approved: boolean;
  held: boolean;
  reports: bigint;
};

export function useAdminQueue(refetchMs = 3000) {
  const publicClient = usePublicClient() as PublicClient | undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Array<{ id: number; c: Campaign }>>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // ✅ TS + runtime guard
      if (!publicClient) {
        setLoading(true);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextId = (await publicClient.readContract({
          address: CROWDFUND_ADDRESS,
          abi: CROWDFUND_ABI,
          functionName: "nextId",
        })) as bigint;

        const n = Number(nextId ?? 0n);

        const res: Array<{ id: number; c: Campaign }> = [];

        for (let id = 0; id < n; id++) {
          const c = (await publicClient.readContract({
            address: CROWDFUND_ADDRESS,
            abi: CROWDFUND_ABI,
            functionName: "getCampaign",
            args: [BigInt(id)],
          })) as Campaign;

          // só traz as reais
          if (c?.exists) res.push({ id, c });
        }

        if (!cancelled) setRows(res);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.shortMessage || e?.message || "Failed to load admin queue.");
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // roda agora
    load();

    // e repete
    const t = setInterval(load, refetchMs);

    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [publicClient, refetchMs]);

  const existing = useMemo(() => rows.filter((x) => x.c.exists), [rows]);
  const pending = useMemo(() => existing.filter((x) => !x.c.approved), [existing]);
  const reported = useMemo(() => existing.filter((x) => (x.c.reports ?? 0n) > 0n), [existing]);

  return {
    loading,
    error,
    rows,
    existing,
    pending,
    reported,
    nextId: BigInt(rows.length), // opcional; se quiser o real, pode armazenar nextId em state também
  };
}
