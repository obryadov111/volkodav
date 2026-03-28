export default function SeverityBadge({ level }) {
  const styles = {
    critical: "bg-red-500/10 text-red-400",
    high: "bg-orange-500/10 text-orange-400",
    medium: "bg-yellow-500/10 text-yellow-400",
    low: "bg-green-500/10 text-green-400",
  };

  return (
    <span className={`px-2 py-1 text-xs rounded ${styles[level]}`}>
      {level.toUpperCase()}
    </span>
  );
}