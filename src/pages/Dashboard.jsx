import ComplianceChart from "../components/ComplianceChart";
import CategoryChart from "../components/CategoryChart";
import TrendChart from "../components/TrendChart";
import AssetsChart from "../components/AssetsChart";

export default function Dashboard() {
  return (
    <div className="space-y-8">

      <h1 className="text-3xl font-semibold">Обзор системы</h1>
      <h2 className="text-lg font-medium mt-6">Аналитика</h2>

      {/* метрики */}
      <div className="grid grid-cols-4 gap-4">

        <Card title="Активы" value="124" />
        <Card title="Проверки" value="542" />
        <Card title="Соответствие" value="78%" color="green" />
        <Card title="Отклонения" value="34" color="red" />

      </div>

      {/* большие блоки */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <ComplianceChart />
        <CategoryChart />
        <TrendChart />
        <AssetsChart />
      </div>

    </div>
  );
}

function Card({ title, value, color }) {
  return (
    <div className="card p-4">
      <p className="text-zinc-400 text-sm">{title}</p>

      <p
        className={`text-2xl mt-2 font-semibold ${
          color === "green"
          ? "text-green-400"
          : color === "red"
          ? "text-red-400"
          : "text-blue-400"
        }`}
        >
        {value}
      </p>
    </div>
  );
}

function BigCard({ title }) {
  return (
    <div className="card p-5">
      <p className="text-zinc-400 mb-3">{title}</p>
      <div className="h-40 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900"></div>
    </div>
  );
}