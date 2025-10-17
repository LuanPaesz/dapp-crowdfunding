export default function Progress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
