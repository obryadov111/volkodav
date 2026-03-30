import { supabase } from '../supabase'

export const authApi = {
  // Вход
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password: password,
    })

    if (error) throw new Error('Неверный email или пароль')
    return data
  },

  // Выход
  async logout() {
    await supabase.auth.signOut()
  },

  // Получить текущего пользователя
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Получить сессию
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },

  // Подписка на изменения авторизации
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}