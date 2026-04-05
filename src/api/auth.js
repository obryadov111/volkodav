import {
  apiFetch,
  clearStoredAccessToken,
  getStoredAccessToken,
  onClientAuthStateChange,
  setStoredAccessToken,
} from "./client";

const TEMP_2FA_KEY = "volkodav_temp_2fa_token";

export const authApi = {
  async login(email, password) {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    });

    if (data.two_factor_required) {
      localStorage.setItem(TEMP_2FA_KEY, data.temp_token);
      return data;
    }

    if (data.access_token) {
      setStoredAccessToken(data.access_token);
    }

    return data;
  },

  async verify2FA(code) {
    const tempToken = localStorage.getItem(TEMP_2FA_KEY);
    if (!tempToken) {
      throw new Error("Временный токен 2FA не найден");
    }

    const data = await apiFetch("/auth/verify-2fa", {
      method: "POST",
      body: JSON.stringify({
        temp_token: tempToken,
        code: code.trim(),
      }),
    });

    localStorage.removeItem(TEMP_2FA_KEY);

    if (data.access_token) {
      setStoredAccessToken(data.access_token);
    }

    return data;
  },

  async logout() {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch (_) {
      // logout должен быть идемпотентным
    } finally {
      localStorage.removeItem(TEMP_2FA_KEY);
      clearStoredAccessToken();
    }
  },

  async getSession() {
    const token = getStoredAccessToken();
    return token ? { access_token: token } : null;
  },

  async getCurrentUser() {
    return this.getMyProfile();
  },

  async getMyProfile() {
    return apiFetch("/auth/me");
  },

  async setup2FA() {
    return apiFetch("/auth/2fa/setup", { method: "POST" });
  },

  async enable2FA(code) {
    return apiFetch("/auth/2fa/enable", {
      method: "POST",
      body: JSON.stringify({ code: code.trim() }),
    });
  },

  async disable2FA(code) {
    return apiFetch("/auth/2fa/disable", {
      method: "POST",
      body: JSON.stringify({ code: code.trim() }),
    });
  },

  async verifyBackupCode(code) {
    const tempToken = localStorage.getItem(TEMP_2FA_KEY);
    if (!tempToken) {
      throw new Error("Временный токен 2FA не найден");
    }

    const data = await apiFetch("/auth/verify-backup-code", {
      method: "POST",
      body: JSON.stringify({
        temp_token: tempToken,
        code: code.trim(),
      }),
    });

    localStorage.removeItem(TEMP_2FA_KEY);

    if (data.access_token) {
      setStoredAccessToken(data.access_token);
    }

    return data;
  },

  onAuthStateChange(callback) {
    return onClientAuthStateChange(callback);
  },
};