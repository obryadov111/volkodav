import {
  apiFetch,
  clearStoredAccessToken,
  getStoredAccessToken,
  onClientAuthStateChange,
  setStoredAccessToken,
} from "./client";

export const authApi = {
  async login(email, password) {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    });

    if (data.access_token) {
      setStoredAccessToken(data.access_token);
    }

    return data;
  },

  async verify2FA(tempToken, code) {
    const data = await apiFetch("/auth/verify-2fa", {
      method: "POST",
      body: JSON.stringify({
        temp_token: tempToken,
        code: code.trim(),
      }),
    });

    if (data.access_token) {
      setStoredAccessToken(data.access_token);
    }

    return data;
  },

  async logout() {
    clearStoredAccessToken();
  },

  async getSession() {
    const token = getStoredAccessToken();
    return token ? { access_token: token } : null;
  },

  async getCurrentUser() {
    return apiFetch("/auth/me");
  },

  async getMyProfile() {
    return apiFetch("/auth/me");
  },

  onAuthStateChange(callback) {
    return onClientAuthStateChange(callback);
  },
};
