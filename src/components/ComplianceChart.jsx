import { PieChart, Pie, Tooltip, Cell } from "recharts";
import ChartTooltip from "./ChartTooltip";

const COLORS = ["#22c55e", "#ef4444"];

const data = [
  { name: "Соответствует", value: 78 },
  { name: "Отклонения", value: 22 },
];

export default function ComplianceChart() {
  return (
    <div className="card p-4 hover:ring-1 hover:ring-blue-500/20">
      <p className="text-sm text-zinc-400 mb-3">Общее соответствие</p>

      <PieChart width={250} height={200}>
        <Pie data={data} dataKey="value">
        {data.map((entry, index) => (
          <Cell key={index} fill={COLORS[index]} />
        ))}
      </Pie>
        <Tooltip content={<ChartTooltip />} />
      </PieChart>
    </div>
  );
}