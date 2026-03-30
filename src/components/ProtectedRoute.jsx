import { Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { authApi } from '../api/auth'

export default function ProtectedRoute({ children, requiredPermission = null }) {
  const [isValid, setIsValid] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const location = useLocation()

  useEffect(() => {
    validateAuth()
  }, [])

  async function validateAuth() {
    try {
      const token = await authApi.validateSession()
      
      if (!token) {
        setIsValid(false)
        setLoading(false)
        return
      }

      // Декодируем токен для проверки прав
      const payload = JSON.parse(atob(token.split('.')[1]))
      setUser(payload)

      // Проверка конкретного разрешения
      if (requiredPermission && !payload.permissions?.includes(requiredPermission)) {
        setIsValid(false)
        setLoading(false)
        return
      }

      setIsValid(true)
    } catch (err) {
      console.error('Ошибка валидации:', err)
      setIsValid(false)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    )
  }

  if (!isValid) {
    // Сохраняем путь для редиректа после логина
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Передаём user в children через context или cloneElement
  return children
}