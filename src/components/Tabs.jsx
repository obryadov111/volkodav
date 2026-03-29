import { useState } from "react";

export default function Tabs({ tabs }) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="flex border-b border-zinc-800 mb-4">
        {tabs.map((t, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`px-4 py-2 text-sm ${
              active === i
                ? "border-b-2 border-white text-white"
                : "text-zinc-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>{tabs[active].content}</div>
    </div>
  );
}