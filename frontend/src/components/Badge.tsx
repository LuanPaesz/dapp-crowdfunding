export default function Badge({ children, color = "purple" }: { children: any, color?: "purple"|"cyan"|"gray" }) {
  const cls =
    color === "cyan" ? "bg-[#06B6D4]/15 text-[#06B6D4]" :
    color === "gray" ? "bg-white/10 text-white/60" :
    "bg-[#8B5CF6]/15 text-[#8B5CF6]";
  return <span className={`px-2 py-1 rounded-lg text-xs ${cls}`}>{children}</span>;
}
