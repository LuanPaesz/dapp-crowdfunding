import { useAccount, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { useMemo, useState } from "react";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "../lib/contract";

const MAX_DESC = 280;

export default function Create() {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [goalEth, setGoalEth] = useState("1");   // mantém como stringgi
  const [daysStr, setDaysStr] = useState("7");   // string p/ permitir apagar

  // ETH -> wei seguro
  const goalWei = useMemo(() => {
    try {
      return parseEther((goalEth || "0").replace(",", "."));
    } catch {
      return null;
    }
  }, [goalEth]);

  // valores derivados p/ exibir
  const goalEthPreview = useMemo(() => {
    if (!goalWei) return 0;
    return Number(goalWei) / 1e18;
  }, [goalWei]);

  // duração
  const daysNum = daysStr === "" ? NaN : Number(daysStr);
  const validDays = Number.isFinite(daysNum) && daysNum >= 1 && daysNum <= 365;
  const endDate = validDays
    ? new Date(Date.now() + Number(daysNum) * 24 * 60 * 60 * 1000)
    : null;

  // validação
  const formError =
    !title.trim()
      ? "Title of Campaign."
      : !desc.trim()
      ? "Description is required."
      : desc.length > MAX_DESC
      ? `Description too long (max ${MAX_DESC} chars).`
      : !goalWei || goalWei <= 0n
      ? "Invalid goal. Please use a value greater than 0."
      : daysStr === ""
      ? "Inform the duration in days."
      : !validDays
      ? "Invalid duration (1 to 365 days)."
      : null;

  // handlers
  const onEthChange = (v: string) => {
    if (!/^[0-9.,]*$/.test(v)) return;
    setGoalEth(v);
  };
  const onDaysChange = (v: string) => {
    if (v === "" || /^\d+$/.test(v)) setDaysStr(v);
  };
  const onDaysBlur = () => {
    if (daysStr === "") return;
    const n = Math.min(365, Math.max(1, Number(daysStr)));
    setDaysStr(String(n));
  };
  const onDescChange = (v: string) => {
    if (v.length <= MAX_DESC) setDesc(v);
  };

  const onCreate = async () => {
    if (formError || !goalWei) return;
    const days = Math.min(365, Math.max(1, Number(daysStr || 0)));

    await writeContractAsync({
      address: CROWDFUND_ADDRESS,
      abi: CROWDFUND_ABI,
      functionName: "createCampaign",
      args: [title.trim(), desc.trim(), goalWei, BigInt(days)],
    });

    setTitle("");
    setDesc("");
    setGoalEth("1");
    setDaysStr("7");
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Create Campaign</h1>

      <div className="grid md:grid-cols-2 gap-4">
        <input
          className="input bg-white/5 border-white/10"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          className="input bg-white/5 border-white/10"
          placeholder="Goal (ETH)"
          inputMode="decimal"
          value={goalEth}
          onChange={(e) => onEthChange(e.target.value)}
        />

        <div className="md:col-span-2 space-y-1">
          <textarea
            className="input bg-white/5 border-white/10 h-28 resize-vertical"
            placeholder="Description"
            value={desc}
            onChange={(e) => onDescChange(e.target.value)}
          />
          <div className="text-xs text-white/50 text-right">
            {desc.length}/{MAX_DESC}
          </div>
        </div>

        <input
          className="input bg-white/5 border-white/10"
          type="text"
          inputMode="numeric"
          placeholder="Duration (days)"
          value={daysStr}
          onChange={(e) => onDaysChange(e.target.value)}
          onBlur={onDaysBlur}
        />

        {/* ── RESUMO/AVISO ABAIXO DOS CAMPOS ───────────────────────────── */}
        <div className="md:col-span-2 text-sm rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span>
              <span className="opacity-70">Goal:</span>{" "}
              <b>{goalEthPreview.toLocaleString(undefined, { maximumFractionDigits: 6 })} ETH</b>
            </span>

            <span>•</span>

            <span>
              <span className="opacity-70">Duration:</span>{" "}
              <b>{validDays ? `${daysNum} day(s)` : "—"}</b>
              {endDate && (
                <span className="opacity-70"> (ends {endDate.toLocaleString()})</span>
              )}
            </span>
          </div>
        </div>
        {/* ──────────────────────────────────────────────────────────────── */}
      </div>

      {formError && (
        <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm">
          {formError}
        </div>
      )}

      <button
        className="btn bg-[#8B5CF6] hover:bg-[#7C3AED] border-transparent"
        disabled={!address || isPending || !!formError}
        onClick={onCreate}
      >
        {isPending ? "Creating..." : "Create Campaign"}
      </button>
    </div>
  );
}
