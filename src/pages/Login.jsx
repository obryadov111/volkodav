import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { authApi } from "../api/auth";

export default function Login() {
  const navigate = useNavigate();

  const [step, setStep] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [backupCode, setBackupCode] = useState("");

  const [useBackupCode, setUseBackupCode] = useState(false);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    authApi
      .getSession()
      .then((session) => setHasSession(Boolean(session)))
      .catch(() => setHasSession(false))
      .finally(() => setHasCheckedSession(true));
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const result = await authApi.login(loginEmail, loginPassword);

      if (result.two_factor_required) {
        setStep("2fa");
        setInfo("Введите код из приложения-аутентификатора.");
        return;
      }

      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify2FA(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authApi.verify2FA(totpCode);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Неверный код 2FA");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyBackupCode(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authApi.verifyBackupCode(backupCode);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Неверный backup code");
    } finally {
      setLoading(false);
    }
  }

  if (hasCheckedSession && hasSession) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <h1 className="text-2xl font-semibold mb-2">Volkodav</h1>
        <p className="text-sm text-zinc-400 mb-6">
          {step === "login" ? "Вход в систему" : "Подтверждение 2FA"}
        </p>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {info ? (
          <div className="mb-4 rounded-lg border border-blue-900 bg-blue-950/40 px-3 py-2 text-sm text-blue-300">
            {info}
          </div>
        ) : null}

        {step === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 outline-none focus:border-blue-500"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-400">Пароль</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Введите пароль"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 outline-none focus:border-blue-500"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium transition hover:bg-blue-500 disabled:opacity-60"
            >
              {loading ? "Входим..." : "Войти"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex rounded-lg border border-zinc-800 p-1">
              <button
                type="button"
                onClick={() => setUseBackupCode(false)}
                className={`flex-1 rounded-md px-3 py-2 text-sm ${
                  !useBackupCode ? "bg-blue-600 text-white" : "text-zinc-400"
                }`}
              >
                Код из приложения
              </button>
              <button
                type="button"
                onClick={() => setUseBackupCode(true)}
                className={`flex-1 rounded-md px-3 py-2 text-sm ${
                  useBackupCode ? "bg-blue-600 text-white" : "text-zinc-400"
                }`}
              >
                Backup code
              </button>
            </div>

            {!useBackupCode ? (
              <form onSubmit={handleVerify2FA} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-zinc-400">6-значный код</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="123456"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium transition hover:bg-blue-500 disabled:opacity-60"
                >
                  {loading ? "Проверяем..." : "Подтвердить"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyBackupCode} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-zinc-400">Backup code</label>
                  <input
                    type="text"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value)}
                    placeholder="AB12-CD34"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium transition hover:bg-blue-500 disabled:opacity-60"
                >
                  {loading ? "Проверяем..." : "Войти по backup code"}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => {
                setStep("login");
                setError("");
                setInfo("");
                setTotpCode("");
                setBackupCode("");
              }}
              className="w-full rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
            >
              Назад
            </button>
          </div>
        )}
      </div>
    </div>
  );
}