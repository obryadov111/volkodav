import { BarChart, Bar, XAxis, Tooltip } from "recharts";
import ChartTooltip from "./ChartTooltip";

const data = [
  { name: "OS", fail: 10 },
  { name: "SSH", fail: 5 },
  { name: "Firewall", fail: 3 },
];

export default function CategoryChart() {
  return (
    <div className="card p-4 hover:ring-1 hover:ring-blue-500/20">
      <p className="text-sm text-zinc-400 mb-3">Отклонения по категориям</p>

      <BarChart width={300} height={200} data={data}>
        <XAxis dataKey="name" />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="fail" fill="#ef4444" />
      </BarChart>
    </div>
  );
}