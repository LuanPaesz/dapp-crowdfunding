import React, { useState } from "react";
import { useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "../lib/contract";

// Adapte para integrar com IPFS ou algum serviço de upload
async function uploadToIpfs(file: File): Promise<string> {
  // Use api de upload IPFS/Pinata aqui
  // return 'https://ipfs.io/ipfs/hash...';
  return URL.createObjectURL(file);
}

export default function CampaignForm({ onCreated }: { onCreated?: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [durationDays, setDurationDays] = useState(1);
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const { writeContractAsync } = useWriteContract();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const url = await uploadToIpfs(file);
    setMediaUrl(url);
    setIsUploading(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title || !description || Number(goal) <= 0 || durationDays < 1) {
      setError("Preencha todos os campos corretamente.");
      return;
    }
    // Se usar IPFS, salve 'mediaUrl' no contrato
    try {
      await writeContractAsync({ address: CROWDFUND_ADDRESS, abi: CROWDFUND_ABI, functionName: "createCampaign", args: [title, description + (mediaUrl ? `\nMEDIA:${mediaUrl}` : ""), parseEther(goal), BigInt(durationDays)] });
      setTitle(""); setDescription(""); setGoal(""); setDurationDays(1); setMediaUrl("");
      onCreated?.();
    } catch (err: any) {
      setError(err?.message ?? "Erro ao criar campanha");
    }
  }

  return (
    <form className="bg-[#1a1a1a] p-6 rounded-xl" onSubmit={onSubmit}>
      <input type="text" placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} className="w-full mb-2 p-2 rounded bg-gray-800 border border-gray-600 text-white" />
      <textarea placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)} className="w-full mb-2 p-2 rounded bg-gray-800 border border-gray-600 text-white" />
      <input type="number" min={0.01} step={0.01} placeholder="Meta em ETH" value={goal} onChange={e => setGoal(e.target.value)} className="w-full mb-2 p-2 rounded bg-gray-800 border border-gray-600 text-white" />
      <input type="number" min={1} placeholder="Duração (dias)" value={durationDays} onChange={e => setDurationDays(Number(e.target.value))} className="w-full mb-2 p-2 rounded bg-gray-800 border border-gray-600 text-white" />
      <input type="file" accept="image/*" onChange={handleMediaChange} className="mb-2" />
      {isUploading && <div className="text-purple-400">Enviando mídia...</div>}
      {mediaUrl && <img src={mediaUrl} alt="Mídia" className="w-32 h-32 object-cover mb-2 rounded" />}
      {error && <div className="text-red-400 mb-2">{error}</div>}
      <button type="submit" className="px-4 py-2 rounded bg-purple-600 text-white">Criar campanha</button>
    </form>
  );
}
