import { useState } from "react";
import { adminCreateUser } from "../api/users";

const ROLE_OPTIONS = [
  { value: "admin", label: "Администратор" },
  { value: "auditor", label: "Аудитор" },
  { value: "operator", label: "Оператор" },
  { value: "viewer", label: "Наблюдатель" },
];

export default function AdminCreateUser() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("viewer");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function createUser(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      setLoading(true);

      await adminCreateUser({
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim() || null,
        display_name: fullName.trim() || null,
        role,
      });

      setMessage(`Пользователь ${email} создан`);
      setEmail("");
      setPassword("");
      setFullName("");
      setRole("viewer");
    } catch (err) {
      setError(err.message || "Ошибка создания пользователя");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-6 text-white">
      <h1 className="mb-6 text-2xl font-semibold">Создание пользователя</h1>

      <form onSubmit={createUser} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div>
          <label className="mb-1 block text-sm text-zinc-400">ФИО</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 outline-none focus:border-blue-500"
            placeholder="Иван Петров"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-zinc-400">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 outline-none focus:border-blue-500"
            placeholder="user@example.com"
            type="email"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-zinc-400">Пароль</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 outline-none focus:border-blue-500"
            placeholder="Введите пароль"
            type="password"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-zinc-400">Роль</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 outline-none focus:border-blue-500"
          >
            {ROLE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium transition hover:bg-blue-500 disabled:opacity-60"
        >
          {loading ? "Создаём..." : "Создать"}
        </button>

        {message ? (
          <div className="rounded-lg border border-emerald-900 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-300">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        ) : null}
      </form>
    </div>
  );
}