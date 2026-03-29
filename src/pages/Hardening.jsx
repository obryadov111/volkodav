import StatusBadge from "../components/StatusBadge";
import { useState } from "react";

const checks = [
  {
    name: "SSH Root Login",
    status: "fail",
    current: "PermitRootLogin yes",
    expected: "PermitRootLogin no",
  },
  {
    name: "Password Length",
    status: "pass",
    current: "minlen=12",
    expected: "minlen>=12",
  },
];

export default function Hardening() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-semibold">Харденинг</h1>

      <div className="grid grid-cols-3 gap-4">

        {/* список */}
        <div className="card p-4 hover:scale-[1.01] transition cursor-pointer">

          {checks.map((c, i) => (
            <div
              key={i}
              onClick={() => setSelected(c)}
              className="p-3 border-b border-zinc-800 hover:bg-zinc-800 cursor-pointer"
            >
              <p>{c.name}</p>
              <StatusBadge status={c.status} />
            </div>
          ))}

        </div>

        {/* детали */}
        <div className="card p-5">

          {selected ? (
            <>
              <h2 className="mb-4">{selected.name}</h2>

              <div className="grid grid-cols-2 gap-4 text-sm">

                <div>
                  <p className="text-zinc-400 mb-2">Текущее</p>
                  <pre className="bg-black p-3 rounded text-red-400">
                    {selected.current}
                  </pre>
                </div>

                <div>
                  <p className="text-zinc-400 mb-2">Требуемое</p>
                  <pre className="bg-black p-3 rounded text-green-400">
                    {selected.expected}
                  </pre>
                </div>

              </div>
            </>
          ) : (
            <p className="text-zinc-400">Выберите проверку</p>
          )}

        </div>

      </div>

    </div>
  );
}