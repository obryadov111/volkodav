import { useMemo, useState } from "react";

/**
 * Клиентская сортировка по клику на заголовок таблицы.
 * accessors — объект { columnKey: (row) => сравниваемое значение }.
 */
export function useSort(rows, accessors, initialKey = null) {
  const [activeKey, setActiveKey] = useState(initialKey);
  const [sortDir, setSortDir] = useState("asc");

  function toggleSort(key) {
    if (!accessors[key]) return;

    if (activeKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setActiveKey(key);
      setSortDir("asc");
    }
  }

  const sortedRows = useMemo(() => {
    if (!activeKey || !accessors[activeKey]) return rows;

    const getValue = accessors[activeKey];
    const copy = [...rows];

    copy.sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);

      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;

      if (typeof va === "number" && typeof vb === "number") {
        return sortDir === "asc" ? va - vb : vb - va;
      }

      const cmp = String(va).localeCompare(String(vb), "ru");
      return sortDir === "asc" ? cmp : -cmp;
    });

    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, activeKey, sortDir]);

  return { sortedRows, activeKey, sortDir, toggleSort };
}
