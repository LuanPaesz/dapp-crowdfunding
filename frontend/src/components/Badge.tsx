import type { ReactNode } from "react";

type BadgeProps = Readonly<{
  children: ReactNode;
  color?: "purple" | "cyan" | "gray";
}>;

export default function Badge({
  children,
  color = "purple",
}: BadgeProps) {
  let className = "bg-[#8B5CF6]/15 text-[#8B5CF6]";

  if (color === "cyan") {
    className = "bg-[#06B6D4]/15 text-[#06B6D4]";
  } else if (color === "gray") {
    className = "bg-white/10 text-white/60";
  }

  return (
    <span className={`rounded-lg px-2 py-1 text-xs ${className}`}>
      {children}
    </span>
  );
}