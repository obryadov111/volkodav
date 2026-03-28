export default function Policies() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Политики безопасности</h1>

      <div className="bg-zinc-900 border border-zinc-800 rounded p-4">
        <p className="font-medium">SSH Hardening</p>
        <p className="text-sm text-zinc-400 mt-2">
          Отключение root-доступа, ограничение IP, ключевая авторизация
        </p>
      </div>
    </div>
  );
}