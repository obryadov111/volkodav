export default function Topbar() {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 backdrop-blur bg-[#0b0f14]/80">

      <input
        placeholder="Поиск по системе..."
        className="bg-zinc-900/60 px-3 py-1.5 rounded-md w-96 text-sm border border-zinc-800 focus:border-zinc-600"
      />

      <div className="flex items-center gap-4 text-sm text-zinc-400">
        admin
      </div>
    </header>
  );
}