// frontend/src/components/CampaignForm.tsx
import React, { useState } from "react";
import { useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "../lib/contract";

// Adapte para integrar com IPFS ou algum serviço de upload
async function uploadToIpfs(file: File): Promise<string> {
  // Exemplo: aqui você colocaria Pinata / Web3Storage / NFT.Storage etc.
  // Por enquanto: URL local (não serve pra produção, mas ok pra teste)
  return URL.createObjectURL(file);
}

export default function CampaignForm({ onCreated }: { onCreated?: () => void }) {
  const { writeContractAsync } = useWriteContract();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const [projectLink, setProjectLink] = useState("");
  const [goal, setGoal] = useState("");
  const [durationDays, setDurationDays] = useState<number>(1);

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const url = await uploadToIpfs(file);
      setMediaUrl(url);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao enviar mídia");
    } finally {
      setIsUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError("Preencha título e descrição.");
      return;
    }
    if (!goal || Number(goal) <= 0) {
      setError("Meta (ETH) inválida.");
      return;
    }
    if (durationDays < 1) {
      setError("Duração deve ser >= 1 dia.");
      return;
    }

    try {
      // ✅ Agora bate com o ABI:
      // createCampaign(string title, string description, string media, string projectLink, uint goal, uint durationDays)
      await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "createCampaign",
        args: [
          title.trim(),
          description.trim(),
          mediaUrl ?? "",
          projectLink.trim() ?? "",
          parseEther(goal),
          BigInt(durationDays),
        ],
      });

      setTitle("");
      setDescription("");
      setMediaUrl("");
      setProjectLink("");
      setGoal("");
      setDurationDays(1);

      onCreated?.();
    } catch (err: any) {
      // MetaMask costuma mandar "Internal JSON-RPC error" se estimateGas falhar.
      // Aqui a gente tenta pegar algo melhor:
      const msg =
        err?.shortMessage ||
        err?.cause?.shortMessage ||
        err?.details ||
        err?.message ||
        "Erro ao criar campanha";
      setError(String(msg));
    }
  }

  return (
    <form className="bg-[#1a1a1a] p-6 rounded-xl" onSubmit={onSubmit}>
      <input
        type="text"
        placeholder="Título"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full mb-2 p-2 rounded bg-gray-800 border border-gray-600 text-white"
      />

      <textarea
        placeholder="Descrição"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full mb-2 p-2 rounded bg-gray-800 border border-gray-600 text-white"
      />

      <input
        type="text"
        placeholder="Media URL (opcional) ou envie arquivo abaixo"
        value={mediaUrl}
        onChange={(e) => setMediaUrl(e.target.value)}
        className="w-full mb-2 p-2 rounded bg-gray-800 border border-gray-600 text-white"
      />

      <input
        type="text"
        placeholder="Project link (GitHub / Website)"
        value={projectLink}
        onChange={(e) => setProjectLink(e.target.value)}
        className="w-full mb-2 p-2 rounded bg-gray-800 border border-gray-600 text-white"
      />

      <input
        type="number"
        min={0.01}
        step={0.01}
        placeholder="Meta em ETH"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        className="w-full mb-2 p-2 rounded bg-gray-800 border border-gray-600 text-white"
      />

      <input
        type="number"
        min={1}
        placeholder="Duração (dias)"
        value={durationDays}
        onChange={(e) => setDurationDays(Number(e.target.value))}
        className="w-full mb-2 p-2 rounded bg-gray-800 border border-gray-600 text-white"
      />

      <input type="file" accept="image/*" onChange={handleMediaChange} className="mb-2" />

      {isUploading && <div className="text-purple-400">Enviando mídia...</div>}

      {mediaUrl && (
        <div className="mb-2">
          <div className="text-xs text-white/60 mb-1">Preview:</div>
          <img src={mediaUrl} alt="Mídia" className="w-32 h-32 object-cover rounded" />
        </div>
      )}

      {error && <div className="text-red-400 mb-2">{error}</div>}

      <button type="submit" className="px-4 py-2 rounded bg-purple-600 text-white">
        Criar campanha
      </button>
    </form>
  );
}
