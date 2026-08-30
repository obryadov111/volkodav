import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

export default function SortableHeader({ label, sortKey, activeKey, sortDir, onSort }) {
  const isActive = activeKey === sortKey;

  return (
    <th
      onClick={() => onSort(sortKey)}
      className="cursor-pointer select-none px-4 py-3 hover:text-zinc-200"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          sortDir === "asc" ? (
            <ChevronUp size={13} />
          ) : (
            <ChevronDown size={13} />
          )
        ) : (
          <ChevronsUpDown size={13} className="text-zinc-600" />
        )}
      </span>
    </th>
  );
}
