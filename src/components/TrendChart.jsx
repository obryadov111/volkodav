import { LineChart, Line, XAxis, Tooltip } from "recharts";
import ChartTooltip from "./ChartTooltip";

const data = [
  { date: "Неделя 1", compliance: 40 },
  { date: "Неделя 2", compliance: 55 },
  { date: "Неделя 3", compliance: 78 },
];

export default function TrendChart() {
  return (
    <div className="card p-4 hover:ring-1 hover:ring-blue-500/20">
      <p className="text-sm text-zinc-400 mb-3">Динамика соответствия</p>

      <LineChart width={300} height={200} data={data}>
        <XAxis dataKey="date" />
        <Tooltip content={<ChartTooltip />} />
        <Line
          type="monotone"
          dataKey="compliance"
          stroke="#3b82f6"
          strokeWidth={2}
        />
      </LineChart>
    </div>
  );
}