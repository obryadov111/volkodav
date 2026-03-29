export default function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-[#111827] border border-zinc-700 px-3 py-2 rounded-lg shadow-lg">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-sm font-semibold text-white">
        {payload[0].value}
      </p>
    </div>
  );
}