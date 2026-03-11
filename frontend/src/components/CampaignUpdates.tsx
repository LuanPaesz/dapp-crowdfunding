import { useEffect, useMemo, useState } from "react";

type UpdateItem = {
  id: string;
  createdAt: number;
  text: string;
};

function storageKey(campaignId: bigint) {
  return `bf_updates_${campaignId.toString()}`;
}

type CampaignUpdatesProps = Readonly<{
  campaignId: bigint;
  isOwner: boolean;
}>;

export default function CampaignUpdates({
  campaignId,
  isOwner,
}: CampaignUpdatesProps) {
  const key = useMemo(() => storageKey(campaignId), [campaignId]);

  const [items, setItems] = useState<UpdateItem[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as UpdateItem[];
      if (Array.isArray(parsed)) {
        setItems(parsed);
      }
    } catch {
      // ignore invalid localStorage content
    }
  }, [key]);

  function persist(nextItems: UpdateItem[]) {
    setItems(nextItems);
    localStorage.setItem(key, JSON.stringify(nextItems));
  }

  function addUpdate() {
    const cleanText = text.trim();

    if (!cleanText) {
      return;
    }

    const nextItems: UpdateItem[] = [
      {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        text: cleanText,
      },
      ...items,
    ];

    persist(nextItems);
    setText("");
  }

  return (
    <div className="card mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Campaign updates</h2>
        <span className="text-xs text-white/50">Mock posts (off-chain)</span>
      </div>

      {isOwner ? (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Write an update for backers..."
            className="input min-h-[90px]"
          />
          <button type="button" onClick={addUpdate} className="btn-primary text-sm">
            Post update
          </button>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-white/60">No updates yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-white/10 bg-black/20 p-3"
            >
              <div className="text-xs text-white/50">
                {new Date(item.createdAt).toLocaleString()}
              </div>
              <div className="mt-1 whitespace-pre-wrap text-sm">
                {item.text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}