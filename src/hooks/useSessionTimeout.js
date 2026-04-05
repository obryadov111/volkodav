import { useEffect } from "react";
import { authApi } from "../api/auth";

export function useSessionTimeout({ onExpired, intervalMs = 60_000 } = {}) {
  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const session = await authApi.getSession();
        if (!active) return;

        if (!session) {
          onExpired?.();
          return;
        }

        await authApi.getMyProfile();
      } catch (_) {
        if (!active) return;
        onExpired?.();
      }
    }

    checkSession();
    const timer = window.setInterval(checkSession, intervalMs);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [intervalMs, onExpired]);
}