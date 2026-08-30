import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { getScoreTone } from "../utils/score";

/** Пончик pass/fail с крупным % соответствия по центру. */
export default function ComplianceChart({ passed = 0, failed = 0 }) {
  const total = passed + failed;
  const score = total > 0 ? Math.round((passed / total) * 100) : null;
  const tone = getScoreTone(score);

  const data =
    total > 0
      ? [
          { name: "Пройдено", value: passed },
          { name: "Провалено", value: failed },
        ]
      : [{ name: "Нет данных", value: 1 }];

  const colors = total > 0 ? ["#34d399", "#fb7185"] : ["#3f3f46"];

  return (
    <div className="relative" style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="72%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={colors[index]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className={`text-4xl font-bold ${tone.text}`}>{score != null ? `${score}%` : "—"}</div>
        <div className="mt-1 text-xs text-zinc-500">
          {total > 0 ? `${passed} из ${total} проверок` : "нет проверок"}
        </div>
      </div>
    </div>
  );
}
