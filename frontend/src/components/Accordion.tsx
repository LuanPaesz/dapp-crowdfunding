import { useState, type ReactNode } from "react";

type AccordionItemProps = Readonly<{
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}>;

export function AccordionItem({
  title,
  children,
  defaultOpen = false,
}: AccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-white/5"
      >
        <span className="font-semibold">{title}</span>
        <span className="text-white/60">{open ? "–" : "+"}</span>
      </button>

      {open ? (
        <div className="px-5 pb-5 text-sm text-white/75">{children}</div>
      ) : null}
    </div>
  );
}