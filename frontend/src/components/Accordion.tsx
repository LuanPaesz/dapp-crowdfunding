import { useState } from "react";

export function AccordionItem({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5"
      >
        <span className="font-semibold">{title}</span>
        <span className="text-white/60">{open ? "–" : "+"}</span>
      </button>

      {open && <div className="px-5 pb-5 text-sm text-white/75">{children}</div>}
    </div>
  );
}
