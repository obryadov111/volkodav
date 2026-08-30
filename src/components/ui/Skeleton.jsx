export function Skeleton({ className = "" }) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={`h-4 ${colIndex === 0 ? "w-32" : "flex-1"}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
