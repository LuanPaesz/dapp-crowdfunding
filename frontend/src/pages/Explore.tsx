import { useReadContract, useReadContracts } from "wagmi";
import { formatEther } from "viem";
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
};

export default function Explore() {
  // 1) Lê o contador global
  const { data: nextIdData, isLoading: isLoadingNextId, error: nextIdError } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "nextId",
  });

  const nextId = Number(nextIdData ?? 0);
  // 2) Monta as chamadas para cada campanha [0..nextId-1]
  const contracts =
    nextId > 0
      ? Array.from({ length: nextId }, (_, id) => ({
          address: CROWDFUND_ADDRESS,
          abi: CROWDFUND_ABI as unknown as Abi,
          functionName: "getCampaign" as const,
          args: [BigInt(id)],
        }))
      : [];

  // 3) Faz batch (multicall) com tolerância a falha
  const { data: campaignsData, isLoading: isLoadingCampaigns } = useReadContracts({
    contracts,
    allowFailure: true,
  });

  // 4) Trata resultados (ignora reverts e campanhas inexistentes)
  const items =
    campaignsData
      ?.map((res, id) => {
        if (res.status !== "success") return null;
        const c = res.result as unknown as Campaign;
        if (!c?.exists) return null;
        return { id, c };
      })
      .filter(Boolean) ?? [];

  // estados de loading/erro
  if (isLoadingNextId || isLoadingCampaigns) {
    return <div className="p-6">Carregando campanhas…</div>;
  }

  if (nextIdError) {
    return <div className="p-6 text-red-600">Erro ao ler nextId: {String(nextIdError.message ?? nextIdError)}</div>;
  }

  if (!items.length) {
    return <div className="p-6">Nenhuma campanha encontrada.</div>;
  }

  return (
    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((it) => {
        const { id, c } = it as { id: number; c: Campaign };
        return (
          <div key={id} className="rounded-2xl shadow p-4 bg-white/5 border border-white/10">
            <div className="text-xs opacity-70 mb-1">#{id}</div>
            <h3 className="text-lg font-semibold">{c.title}</h3>
            <p className="text-sm opacity-80 line-clamp-3 mt-1">{c.description}</p>

            <div className="mt-3 text-sm">
              <div>
                <span className="opacity-70">Meta:</span> Ξ {formatEther(c.goal)}
              </div>
              <div>
                <span className="opacity-70">Arrecadado:</span> Ξ {formatEther(c.totalRaised)}
              </div>
              <div className="opacity-70">
                Deadline: {new Date(Number(c.deadline) * 1000).toLocaleString()}
              </div>
            </div>

            {/* exemplo de botão de contribuir poderia ir aqui */}
          </div>
        );
      })}
    </div>
  );
}
