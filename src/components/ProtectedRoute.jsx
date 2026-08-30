import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { authApi } from "../api/auth";

export default function ProtectedRoute() {
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const session = await authApi.getSession();
        if (!mounted) return;

        if (!session) {
          setIsAuth(false);
          return;
        }

        await authApi.getMyProfile();
        setIsAuth(true);
      } catch {
        setIsAuth(false);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    checkAuth();

    const subscription = authApi.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      if (!session) {
        setIsAuth(false);
        setLoading(false);
        return;
      }

      try {
        await authApi.getMyProfile();
        setIsAuth(true);
      } catch {
        setIsAuth(false);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.data?.subscription?.unsubscribe?.();
    };
  }, []);

  if (loading) {
    return <div className="p-6 text-zinc-400">Проверка доступа...</div>;
  }

  if (!isAuth) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}