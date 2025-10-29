import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useReadContract, useSimulateContract, useWriteContract } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "../lib/contract";

/*
  Comportamento modificado:
  - Se não existir função de edição no ABI, ao submeter redireciona para /create com query params
    (title, description, goal, deadline) para facilitar recriar a campanha.
  - Se existir, tenta simular/enviar on-chain como antes.
*/

export default function CampaignEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) return <p>Invalid campaign id.</p>;
  const campaignId = BigInt(id);

  // verificar se existe função de edição no ABI
  const hasUpdateFn = CROWDFUND_ABI.some(
    (f: any) => f.type === "function" && f.name === "updateCampaign"
  );

  // Ler campanha on-chain
  const { data: raw } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "getCampaign",
    args: [campaignId],
  }) as { data?: any };

  // states do form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalEth, setGoalEth] = useState("0");
  const [deadline, setDeadline] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!raw) return;
    setTitle(raw.title ?? "");
    setDescription(raw.description ?? "");
    try {
      setGoalEth(raw.goal ? String(Number(formatUnits(raw.goal as bigint, 18))) : "0");
    } catch (e) {
      setGoalEth("0");
    }
    setDeadline(raw.deadline ? Number(raw.deadline) : 0);
  }, [raw]);

  // Se não há função updateCampaign, não usamos simulate/write hooks
  const fnName = "updateCampaign"; // utilizado apenas quando hasUpdateFn === true

  const simulateHook = hasUpdateFn
    ? useSimulateContract({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: fnName as any,
        args: [
          campaignId,
          title,
          description,
          goalEth ? parseUnits(goalEth, 18) : 0n,
          BigInt(deadline),
        ],
        query: {
          enabled: !!title && !!description,
        },
      } as any)
    : { data: undefined };

  const simulateData = simulateHook.data;

  const { writeContractAsync } = useWriteContract();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Se a função updateCampaign NÃO existe: redirecionar para /create com params (opção simples)
    if (!hasUpdateFn) {
      const params = new URLSearchParams({
        title,
        description,
        goal: goalEth,
        deadline: String(deadline),
        // opcional: informar de onde veio
        fromEditId: id ?? "",
      });
      // Navega para a página de criação com os campos preenchidos
      navigate(`/create?${params.toString()}`);
      setLoading(false);
      return;
    }

    // Se existir a função, tenta enviar on-chain como antes (usando simulateData.request)
    if (writeContractAsync && simulateData?.request) {
      try {
        await writeContractAsync(simulateData.request);
        alert("Campaign updated on-chain!");
        navigate(-1);
      } catch (err: any) {
        console.error(err);
        alert("Erro ao tentar atualizar on-chain: " + (err?.message ?? err));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Caso prepare/simulação falhe por outro motivo:
    setLoading(false);
    alert(
      "Não foi possível enviar atualização on-chain: a simulação falhou ou a função não foi encontrada na ABI."
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white/5 p-6 rounded">
      <h2 className="text-2xl font-bold mb-4">Edit Campaign #{id}</h2>

      {!raw ? (
        <p>Loading campaign data...</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/70">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full mt-1 p-2 rounded bg-white/5"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full mt-1 p-2 rounded bg-white/5"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70">Goal (ETH)</label>
            <input
              value={goalEth}
              onChange={(e) => setGoalEth(e.target.value)}
              className="w-full mt-1 p-2 rounded bg-white/5"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70">Deadline (unix seconds)</label>
            <input
              type="number"
              value={deadline}
              onChange={(e) => setDeadline(Number(e.target.value))}
              className="w-full mt-1 p-2 rounded bg-white/5"
            />
            <p className="text-xs text-white/50 mt-1">
              (current: {deadline ? new Date(deadline * 1000).toLocaleString() : "—"})
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700"
            >
              {loading ? "Saving..." : hasUpdateFn ? "Save" : "Recreate on Create"}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
            >
              Cancel
            </button>
          </div>

          {!hasUpdateFn ? (
            <p className="text-sm text-yellow-300 mt-2">
              Nota: este contrato não tem função de edição on‑chain. Ao salvar você será redirecionado
              para a página de criação com os campos pré‑preenchidos para recriar a campanha.
            </p>
          ) : (
            <p className="text-sm text-white/60 mt-2">
              Nota: este formulário tentará chamar a função "{fnName}" on‑chain se ela existir na ABI.
            </p>
          )}
        </form>
      )}
    </div>
  );
}