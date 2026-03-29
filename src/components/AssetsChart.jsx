import { BarChart, Bar, XAxis, Tooltip } from "recharts";
import ChartTooltip from "./ChartTooltip";

const data = [
  { name: "srv-1", value: 90 },
  { name: "srv-2", value: 60 },
  { name: "srv-3", value: 40 },
];

export default function AssetsChart() {
  return (
    <div className="card p-4 hover:ring-1 hover:ring-blue-500/20">
      <p className="text-sm text-zinc-400 mb-3">Соответствие по активам</p>

      <BarChart width={300} height={200} data={data}>
        <XAxis dataKey="name" />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="value" fill="#3b82f6" />
      </BarChart>
    </div>
  );
}