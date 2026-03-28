import { useState } from "react";

const checks = [
  {
    name: "SSH Root Login",
    status: "fail",
    current: "PermitRootLogin yes",
    expected: "PermitRootLogin no",
    description: "Отключить вход root по SSH",
  },
  {
    name: "Password Policy",
    status: "pass",
    current: "minlen=12",
    expected: "minlen>=12",
    description: "Минимальная длина пароля",
  },
];

export default function Hardening() {
  const [filter, setFilter] = useState("all");

  const filtered =
    filter === "all"
      ? checks
      : checks.filter((c) => c.status === filter);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        Проверка конфигураций (харденинг)
      </h1>

      {/* фильтр */}
      <div className="flex gap-2">
        {["all", "fail", "pass"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded"
          >
            {f === "all"
              ? "Все"
              : f === "fail"
              ? "Отклонения"
              : "Соответствует"}
          </button>
        ))}
      </div>

      {/* список */}
      {filtered.map((item, i) => (
        <div
          key={i}
          className="bg-zinc-900 border border-zinc-800 rounded"
        >
          <div className="p-4 flex justify-between">
            <p>{item.name}</p>

            <span
              className={`text-sm ${
                item.status === "fail"
                  ? "text-red-400"
                  : "text-green-400"
              }`}
            >
              {item.status === "fail"
                ? "Не соответствует"
                : "Соответствует"}
            </span>
          </div>

          <div className="grid grid-cols-2 text-sm border-t border-zinc-800">

            <div className="p-4">
              <p className="text-zinc-400 mb-2">Текущее значение</p>
              <code className="text-red-400">{item.current}</code>
            </div>

            <div className="p-4">
              <p className="text-zinc-400 mb-2">Требуемое значение</p>
              <code className="text-green-400">{item.expected}</code>
            </div>

          </div>

          <div className="p-4 text-sm text-zinc-400 border-t border-zinc-800">
            {item.description}
          </div>
        </div>
      ))}
    </div>
  );
}