export default function AppCard({
  title,
  subtitle,
  right,
  children,
  className = "",
  bodyClassName = "",
}) {
  return (
    <section
      className={`rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-lg ${className}`}
    >
      {(title || subtitle || right) && (
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
          <div>
            {title ? (
              <h3 className="text-base font-semibold text-white">{title}</h3>
            ) : null}
            {subtitle ? (
              <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
            ) : null}
          </div>

          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      )}

      <div className={`p-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}