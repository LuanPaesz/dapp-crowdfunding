type ProgressProps = Readonly<{
  value: number;
}>;

export default function Progress({ value }: ProgressProps) {
  const percentage = Math.max(0, Math.min(100, value));

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4]"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}