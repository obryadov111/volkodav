import { supabase } from '../supabase'
import { crypto } from '../services/crypto'
import * as bcrypt from 'bcryptjs'

// ВРЕМЕННЫЙ ТЕСТ: проверим, работает ли bcryptjs
const testHash = bcrypt.hashSync('test123', 12)
console.log('bcryptjs тест - создан хеш:', testHash)
console.log('bcryptjs тест - проверка:', bcrypt.compareSync('test123', testHash))

export const authApi = {
  async updatePassword(email, newPassword) {
    const hash = await bcrypt.hash(newPassword, 12)
    const { error } = await supabase
      .from('users')
      .update({ password_hash: hash })
      .eq('email', email)
  
    if (error) console.error(error)
    else console.log('Пароль обновлён:', hash)
  },

  async login(email, password) {
    // 1. Получаем пользователя
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .single()

    if (userError || !user) {
      console.error('Ошибка получения пользователя:', userError)
      throw new Error('Неверный email или пароль')
    }

    console.log('Найден пользователь:', user.email)
    console.log('Введённый пароль:', password)
    console.log('Хеш из БД:', user.password_hash)
    console.log('Длина пароля:', password.length)
    console.log('Первые 4 символа хеша:', user.password_hash.substring(0, 4))

    // 2. Проверка пароля через bcrypt
    const isValid = bcrypt.compareSync(password, user.password_hash)
    
    if (!isValid) {
      await this.logFailedAttempt(user.id)
      throw new Error('Неверный email или пароль')
    }

    console.log('Пароль верный')

    // 3. Получаем организацию отдельно
    const { data: org, error: orgError } = await supabase
      .from('auditor_organizations')
      .select('id, name, domain')
      .eq('id', user.organization_id)
      .single()

    if (orgError) {
      console.error('Ошибка получения организации:', orgError)
    }

    // 4. Получаем роль отдельно
    const { data: role, error: roleError } = await supabase
      .from('user_roles')
      .select('name, permissions')
      .eq('id', user.role_id)
      .single()

    if (roleError) {
      console.error('Ошибка получения роли:', roleError)
    }

    // 5. Создаём сессию в user_sessions
    const refreshToken = this.generateRandomToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        refresh_token: refreshToken,
        expires_at: expiresAt.toISOString()
      })

    if (sessionError) {
      console.error('Ошибка создания сессии:', sessionError)
    }

    // 6. Обновляем last_used_at в user_2fa
    await supabase
      .from('user_2fa')
      .update({ last_used_at: new Date().toISOString() })
      .eq('user_id', user.id)

    // 7. Создаём JWT
    const payload = {
      sub: user.id,
      email: user.email,
      org_id: user.organization_id,
      org_name: org?.name,
      role: role?.name,
      permissions: role?.permissions,
      full_name: user.full_name
    }

    const accessToken = btoa(JSON.stringify({
      ...payload,
      exp: Date.now() + 3600000, // 1 час
      iat: Date.now()
    }))

    crypto.setSession(accessToken, refreshToken)

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        organization_id: user.organization_id,
        organization_name: org?.name,
        role: role?.name,
        permissions: role?.permissions
      },
      access_token: accessToken,
      refresh_token: refreshToken
    }
  },

  async logout(userId) {
    await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', userId)
    crypto.clearSession()
  },

  async refreshToken(refreshToken) {
    const { data: session, error } = await supabase
      .from('user_sessions')
      .select('*, users(*)')
      .eq('refresh_token', refreshToken)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !session) {
      throw new Error('Сессия истекла')
    }

    const newAccessToken = btoa(JSON.stringify({
      sub: session.user_id,
      email: session.users.email,
      org_id: session.users.organization_id,
      exp: Date.now() + 3600000,
      iat: Date.now()
    }))

    return { access_token: newAccessToken }
  },

  async validateSession() {
    const session = crypto.getSession()
    if (!session) return null

    if (crypto.isTokenExpired(session.access_token)) {
      try {
        const refreshed = await this.refreshToken(session.refresh_token)
        crypto.setSession(refreshed.access_token, session.refresh_token)
        return refreshed.access_token
      } catch {
        crypto.clearSession()
        return null
      }
    }

    return session.access_token
  },

  async logFailedAttempt(userId) {
    console.warn(`Неудачная попытка входа: ${userId} в ${new Date().toISOString()}`)
  },

  generateRandomToken() {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }
}