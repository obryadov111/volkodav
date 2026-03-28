export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Обзор соответствия</h1>

      <div className="grid grid-cols-4 gap-4">

        <Card title="Серверы" value="124" />
        <Card title="Проверки" value="542" />
        <Card title="Соответствие" value="78%" color="text-green-400" />
        <Card title="Отклонения" value="34" color="text-red-400" />

      </div>
    </div>
  );
}

function Card({ title, value, color }) {
  return (
    <div className="bg-zinc-900 p-4 rounded border border-zinc-800">
      <p className="text-zinc-400 text-sm">{title}</p>
      <p className={`text-2xl mt-2 ${color}`}>{value}</p>
    </div>
  );
}