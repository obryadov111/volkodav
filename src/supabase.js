import { createClient } from '@supabase/supabase-js'
import { crypto } from './services/crypto'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

// Создаём клиент с кастомной логикой токенов
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'X-Client-Info': 'yakilka-web'
    }
  }
})

// Перехватчик для добавления токена к запросам
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    crypto.setSession(session.access_token, session.refresh_token)
  } else {
    crypto.clearSession()
  }
})