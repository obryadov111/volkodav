export default function StatusBadge({ status }) {
  const styles =
    status === "fail"
      ? "bg-red-500/10 text-red-400 border-red-500/20"
      : "bg-green-500/10 text-green-400 border-green-500/20";

  const label =
    status === "fail" ? "Не соответствует" : "Соответствует";

  return (
    <span
      className={`px-2 py-1 text-xs rounded-md border ${styles}`}
    >
      {label}
    </span>
  );
}