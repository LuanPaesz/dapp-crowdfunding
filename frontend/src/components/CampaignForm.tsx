import { useState, type ChangeEvent, type FormEvent } from "react";
import { useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "../lib/contract";

async function uploadToIpfs(file: File): Promise<string> {
  return URL.createObjectURL(file);
}

type CampaignFormProps = Readonly<{
  onCreated?: () => void;
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

  if (error instanceof Error) {
    return error.message;
  }

  return "Erro ao criar campanha";
}

export default function CampaignForm({ onCreated }: CampaignFormProps) {
  const { writeContractAsync } = useWriteContract();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [projectLink, setProjectLink] = useState("");
  const [goal, setGoal] = useState("");
  const [durationDays, setDurationDays] = useState(1);

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMediaChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsUploading(true);
      const url = await uploadToIpfs(file);
      setMediaUrl(url);
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setIsUploading(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      await writeContractAsync({
        address: CROWDFUND_ADDRESS,
        abi: CROWDFUND_ABI,
        functionName: "createCampaign",
        args: [
          title.trim(),
          description.trim(),
          mediaUrl,
          projectLink.trim(),
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
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    }
  }

  return (
    <form className="rounded-xl bg-[#1a1a1a] p-6" onSubmit={onSubmit}>
      <input
        type="text"
        placeholder="Título"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="mb-2 w-full rounded border border-gray-600 bg-gray-800 p-2 text-white"
      />

      <textarea
        placeholder="Descrição"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        className="mb-2 w-full rounded border border-gray-600 bg-gray-800 p-2 text-white"
      />

      <input
        type="text"
        placeholder="Media URL (opcional) ou envie arquivo abaixo"
        value={mediaUrl}
        onChange={(event) => setMediaUrl(event.target.value)}
        className="mb-2 w-full rounded border border-gray-600 bg-gray-800 p-2 text-white"
      />

      <input
        type="text"
        placeholder="Project link (GitHub / Website)"
        value={projectLink}
        onChange={(event) => setProjectLink(event.target.value)}
        className="mb-2 w-full rounded border border-gray-600 bg-gray-800 p-2 text-white"
      />

      <input
        type="number"
        min={0.01}
        step={0.01}
        placeholder="Meta em ETH"
        value={goal}
        onChange={(event) => setGoal(event.target.value)}
        className="mb-2 w-full rounded border border-gray-600 bg-gray-800 p-2 text-white"
      />

      <input
        type="number"
        min={1}
        placeholder="Duração (dias)"
        value={durationDays}
        onChange={(event) => setDurationDays(Number(event.target.value))}
        className="mb-2 w-full rounded border border-gray-600 bg-gray-800 p-2 text-white"
      />

      <input
        type="file"
        accept="image/*"
        onChange={handleMediaChange}
        className="mb-2"
      />

      {isUploading ? (
        <div className="text-purple-400">Enviando mídia...</div>
      ) : null}

      {mediaUrl ? (
        <div className="mb-2">
          <div className="mb-1 text-xs text-white/60">Preview:</div>
          <img
            src={mediaUrl}
            alt="Mídia"
            className="h-32 w-32 rounded object-cover"
          />
        </div>
      ) : null}

      {error ? <div className="mb-2 text-red-400">{error}</div> : null}

      <button
        type="submit"
        className="rounded bg-purple-600 px-4 py-2 text-white"
      >
        Criar campanha
      </button>
    </form>
  );
}