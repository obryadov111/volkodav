import { useAuth } from '../contexts/AuthContext'

export default function TopBar({ title = 'Dashboard' }) {
  const { user } = useAuth()

  return (
    <header className="bg-slate-800 border-b border-slate-700 h-16 flex items-center justify-between px-8 sticky top-0 z-40">
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      
      <div className="flex items-center gap-4">
        {/* Уведомления */}
        <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Профиль */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <span className="text-sm font-medium text-emerald-400">
              {user?.email?.[0]?.toUpperCase() || 'A'}
            </span>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-sm text-white">{user?.email?.split('@')[0]}</p>
            <p className="text-xs text-slate-500">Аудитор</p>
          </div>
        </div>
      </div>
    </header>
  )
}