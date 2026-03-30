import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Sidebar from './components/Sidebar'

// Глобальный лоадер
function GlobalLoader() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
    </div>
  )
}

// Защищённый layout
function ProtectedLayout() {
  const { user, loading } = useAuth()

  if (loading) return <GlobalLoader />
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <Sidebar user={user} />
      <main className="flex-1 ml-64">
        <Outlet />
      </main>
    </div>
  )
}

// Публичный layout (только для неавторизованных)
function PublicLayout() {
  const { user, loading } = useAuth()

  if (loading) return <GlobalLoader />
  if (user) return <Navigate to="/dashboard" replace />

  return <Outlet />
}

// Обёртка с провайдером
function AppWithProvider() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/login" element={<Login />} />
          </Route>

          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default AppWithProvider