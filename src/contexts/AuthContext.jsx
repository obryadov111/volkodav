import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshProfile() {
    try {
      const currentSession = await authApi.getSession();
      setSession(currentSession);

      if (!currentSession) {
        setProfile(null);
        return null;
      }

      const me = await authApi.getMyProfile();
      setProfile(me);
      return me;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshProfile().catch((error) => {
      console.error("AuthProvider init error", error);
      setLoading(false);
    });

    const subscription = authApi.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);
      if (!currentSession) {
        setProfile(null);
        return;
      }

      try {
        const me = await authApi.getMyProfile();
        setProfile(me);
      } catch (error) {
        console.error("AuthProvider profile error", error);
        setProfile(null);
      }
    });

    return () => {
      subscription?.data?.subscription?.unsubscribe?.();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      profile,
      loading,
      isAuthenticated: Boolean(session),
      refreshProfile,
      logout: authApi.logout,
    }),
    [session, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}