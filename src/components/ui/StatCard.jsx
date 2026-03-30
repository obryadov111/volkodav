export default function StatCard({
  label,
  value,
  hint,
  tone = "default",
}) {
  const toneMap = {
    default:
      "border-zinc-800 bg-zinc-900/80 text-white",
    success:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    warning:
      "border-amber-500/20 bg-amber-500/10 text-amber-300",
    danger:
      "border-rose-500/20 bg-rose-500/10 text-rose-300",
    info:
      "border-blue-500/20 bg-blue-500/10 text-blue-300",
  };

  return (
    <div className={`rounded-2xl border p-5 ${toneMap[tone] || toneMap.default}`}>
      <div className="text-sm text-zinc-400">{label}</div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
      {hint ? <div className="mt-2 text-xs text-zinc-400">{hint}</div> : null}
    </div>
  );
}