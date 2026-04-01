import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { authApi } from "../api/auth";
import { createUserProfile } from "../api/users";

export default function Login() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerPasswordRepeat, setRegisterPasswordRepeat] = useState("");

  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    authApi
      .getSession()
      .then((session) => {
        setHasSession(Boolean(session));
      })
      .catch(() => setHasSession(false))
      .finally(() => setHasCheckedSession(true));
  }, []);

  async function handleRegister(e) {
  e.preventDefault();
  setError("");
  setInfo("");

  try {
    if (!registerEmail.trim()) {
      throw new Error("Введите email");
    }

    if (registerPassword.length < 6) {
      throw new Error("Пароль минимум 6 символов");
    }

    if (registerPassword !== registerPasswordRepeat) {
      throw new Error("Пароли не совпадают");
    }

    setLoading(true);

    const result = await authApi.register({
      email: registerEmail,
      password: registerPassword,
      displayName: registerName,
    });

    // 🔥 ВАЖНО: создаём запись в public.users
    if (result?.user) {
      await createUserProfile();
    }

    setInfo("Аккаунт создан. Дождитесь выдачи доступа администратором.");
    setMode("login");

  } catch (err) {
    console.error("Ошибка регистрации:", err.message);
    setError(err.message || "Ошибка регистрации");
  } finally {
    setLoading(false);
  }
}

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    try {
      setLoading(true);
      await authApi.login(loginEmail, loginPassword);
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Ошибка входа:", err.message);
      setError(err.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    try {
      if (!registerEmail.trim()) {
        throw new Error("Введите email");
      }

      if (registerPassword.length < 6) {
        throw new Error("Пароль минимум 6 символов");
      }

      if (registerPassword !== registerPasswordRepeat) {
        throw new Error("Пароли не совпадают");
      }

      setLoading(true);

      await authApi.register({
        email: registerEmail,
        password: registerPassword,
        displayName: registerName,
      });

      setInfo("Аккаунт создан. Дождитесь выдачи доступа администратором.");
      setMode("login");
    } catch (err) {
      console.error("Ошибка регистрации:", err.message);
      setError(err.message || "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  }

  if (hasCheckedSession && hasSession) {
    return <Navigate to="/" replace />;
  }

  return (
    
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f14] px-4">
      
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
        <div className="text-center mb-6">
  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-3">
    <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  </div>

  <h1 className="text-2xl font-bold text-white">Yakilka</h1>
  <p className="text-zinc-400 text-sm">Система автоматизации харденинга</p>
</div>
        {/* Переключатель */}
        <div className="mb-6 flex rounded-xl border border-zinc-800 bg-zinc-900 p-1">
          <button
            onClick={() => {
              setMode("login");
              setError("");
              setInfo("");
            }}
            className={`flex-1 rounded-lg px-3 py-2 text-sm ${
              mode === "login"
                ? "bg-blue-500/20 text-blue-300"
                : "text-zinc-400"
            }`}
          >
            Вход
          </button>

          <button
            onClick={() => {
              setMode("register");
              setError("");
              setInfo("");
            }}
            className={`flex-1 rounded-lg px-3 py-2 text-sm ${
              mode === "register"
                ? "bg-blue-500/20 text-blue-300"
                : "text-zinc-400"
            }`}
          >
            Регистрация
          </button>
        </div>

        {/* Заголовок */}
        <h1 className="text-xl font-semibold text-white mb-4">
          {mode === "login" ? "Вход" : "Регистрация"}
        </h1>

        {/* Ошибки */}
        {error && (
          <div className="mb-4 text-sm text-rose-400">
            {error}
          </div>
        )}

        {info && (
          <div className="mb-4 text-sm text-emerald-400">
            {info}
          </div>
        )}

        {/* Форма */}
        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-white outline-none"
            />

            <input
              type="password"
              placeholder="Пароль"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-white outline-none"
            />

            <button
              disabled={loading}
              className="w-full rounded-lg bg-blue-500/20 py-2 text-blue-300 hover:bg-blue-500/30"
            >
              {loading ? "Вход..." : "Войти"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <input
              type="text"
              placeholder="Имя (необязательно)"
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-white outline-none"
            />

            <input
              type="email"
              placeholder="Email"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-white outline-none"
            />

            <input
              type="password"
              placeholder="Пароль"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-white outline-none"
            />

            <input
              type="password"
              placeholder="Повтори пароль"
              value={registerPasswordRepeat}
              onChange={(e) => setRegisterPasswordRepeat(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-white outline-none"
            />

            <button
              disabled={loading}
              className="w-full rounded-lg bg-blue-500/20 py-2 text-blue-300 hover:bg-blue-500/30"
            >
              {loading ? "Регистрация..." : "Создать аккаунт"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}