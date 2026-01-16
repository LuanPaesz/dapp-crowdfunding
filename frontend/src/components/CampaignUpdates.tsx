// frontend/src/components/CampaignUpdates.tsx
import { useEffect, useMemo, useState } from "react";

type UpdateItem = {
  id: string;
  createdAt: number;
  text: string;
};

function storageKey(campaignId: bigint) {
  return `bf_updates_${campaignId.toString()}`;
}

export default function CampaignUpdates({
  campaignId,
  isOwner,
}: {
  campaignId: bigint;
  isOwner: boolean;
}) {
  const key = useMemo(() => storageKey(campaignId), [campaignId]);

  const [items, setItems] = useState<UpdateItem[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as UpdateItem[];
      if (Array.isArray(parsed)) setItems(parsed);
    } catch {
      // ignore
    }
  }, [key]);

  function persist(next: UpdateItem[]) {
    setItems(next);
    localStorage.setItem(key, JSON.stringify(next));
  }

  function addUpdate() {
    const clean = text.trim();
    if (!clean) return;

    const next: UpdateItem[] = [
      {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        text: clean,
      },
      ...items,
    ];

    persist(next);
    setText("");
  }

  return (
    <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Campaign updates</h2>
        <span className="text-xs text-white/50">Mock posts (off-chain)</span>
      </div>

      {isOwner && (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write an update for backers..."
            className="w-full min-h-[90px] px-3 py-2 rounded bg-white/10 border border-white/20 text-sm"
          />
          <button
            onClick={addUpdate}
            className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-sm"
          >
            Post update
          </button>
        </div>
      )}

      {!items.length ? (
        <p className="text-sm text-white/60">No updates yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((u) => (
            <div
              key={u.id}
              className="rounded-xl bg-black/20 border border-white/10 p-3"
            >
              <div className="text-xs text-white/50">
                {new Date(u.createdAt).toLocaleString()}
              </div>
              <div className="text-sm mt-1 whitespace-pre-wrap">{u.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
