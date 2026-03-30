import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { authApi } from '../api/auth'

export default function ProtectedRoute() {
  const [isAuth, setIsAuth] = useState(false)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    let mounted = true

    async function checkAuth() {
      const session = await authApi.getSession()
      if (!mounted) return
      setIsAuth(!!session)
      setLoading(false)
    }

    checkAuth()

    const { data: subscription } = authApi.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setIsAuth(!!session)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription?.subscription?.unsubscribe?.()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    )
  }

  if (!isAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}