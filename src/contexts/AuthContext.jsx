import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = загрузка, null = не авторизован
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authApi.getSession().then(({ session }) => {
      setUser(session?.user || null)
      setLoading(false)
    })

    // Подписка на изменения
    const { data: { subscription } } = authApi.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = {
    user,
    loading,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}