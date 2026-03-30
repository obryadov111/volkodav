import { jwtDecode } from 'jwt-decode'

const TOKEN_KEY = 'yakilka_session'

export const crypto = {
  setSession(accessToken, refreshToken) {
    const session = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: this.getTokenExpiry(accessToken)
    }
    localStorage.setItem(TOKEN_KEY, JSON.stringify(session))
  },

  getSession() {
    const data = localStorage.getItem(TOKEN_KEY)
    return data ? JSON.parse(data) : null
  },

  clearSession() {
    localStorage.removeItem(TOKEN_KEY)
  },

  isTokenExpired(token) {
    try {
      const decoded = jwtDecode(token)
      return decoded.exp * 1000 < Date.now()
    } catch {
      return true
    }
  },

  getTokenData(token) {
    try {
      return jwtDecode(token)
    } catch {
      return null
    }
  },

  getTokenExpiry(token) {
    const decoded = jwtDecode(token)
    return decoded.exp * 1000
  },

  getRandomValues(array) {
    return window.crypto.getRandomValues(array)
  }
}