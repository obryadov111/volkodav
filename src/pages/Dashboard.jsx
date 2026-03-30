import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardApi } from '../api/dashboard'
import { authApi } from '../api/auth'

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [clients, setClients] = useState([])
  const [reports, setReports] = useState([])
  const [assets, setAssets] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')

  // Загрузка данных с обработкой ошибок
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const currentUser = dashboardApi.getCurrentUser()
      if (!currentUser) {
        throw new Error('Сессия истекла')
      }
      setUser(currentUser)

      // Параллельная загрузка всех данных
      const [clientsData, reportsData, assetsData, statsData] = await Promise.all([
        dashboardApi.getClients(currentUser.org_id),
        dashboardApi.getReports(currentUser.org_id, 10),
        dashboardApi.getAssets(),
        dashboardApi.getStats(currentUser.org_id)
      ])

      setClients(clientsData)
      setReports(reportsData)
      setAssets(assetsData)
      setStats(statsData)
    } catch (err) {
      console.error('Ошибка загрузки:', err)
      setError(err.message)
      
      if (err.message.includes('Сессия')) {
        handleLogout()
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleLogout() {
    try {
      if (user?.id) {
        await authApi.logout(user.id)
      }
    } catch (err) {
      console.error('Ошибка выхода:', err)
    } finally {
      navigate('/login')
    }
  }

  async function handleFilterChange(criticality) {
    setActiveFilter(criticality)
    try {
      const filteredAssets = await dashboardApi.getAssets(
        criticality === 'all' ? {} : { criticality }
      )
      setAssets(filteredAssets)
    } catch (err) {
      console.error('Ошибка фильтрации:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={loadData}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
          >
            Повторить
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <span className="text-xl font-bold text-white">Yakilka</span>
                <span className="ml-2 text-sm text-slate-400">| {user?.org_name}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="block text-sm text-white">{user?.full_name}</span>
                <span className="text-xs text-slate-500">{user?.role}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Панель управления</h1>
          <p className="text-slate-400">Управление аудитами безопасности клиентов</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard 
            label="Клиентов" 
            value={clients.length} 
            color="emerald" 
          />
          <StatCard 
            label="Активов" 
            value={assets.length} 
            color="blue" 
          />
          <StatCard 
            label="Проверок" 
            value={stats?.total || 0} 
            color="yellow" 
          />
          <StatCard 
            label="Соответствие" 
            value={`${Math.round(reports.reduce((a, r) => a + (r.compliance_score || 0), 0) / (reports.length || 1))}%`}
            color="emerald"
          />
        </div>

        {/* Фильтры активов */}
        <div className="mb-6 flex gap-2">
          {['all', 'critical', 'high', 'medium', 'low'].map((filter) => (
            <button
              key={filter}
              onClick={() => handleFilterChange(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === filter
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {filter === 'all' ? 'Все' : filter}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Отчёты */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">Отчёты харденинга</h2>
            </div>
            
            {reports.length === 0 ? (
              <EmptyState message="Нет отчётов" />
            ) : (
              <div className="divide-y divide-slate-700 max-h-96 overflow-auto">
                {reports.map((report) => (
                  <ReportRow key={report.id} report={report} />
                ))}
              </div>
            )}
          </div>

          {/* Клиенты */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">Клиенты</h2>
            </div>
            
            {clients.length === 0 ? (
              <EmptyState message="Нет клиентов" />
            ) : (
              <div className="divide-y divide-slate-700 max-h-96 overflow-auto">
                {clients.map((client) => (
                  <ClientRow key={client.id} client={client} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Активы */}
        <div className="mt-8 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Активы инфраструктуры</h2>
          </div>
          
          {assets.length === 0 ? (
            <EmptyState message="Нет активов" />
          ) : (
            <div className="divide-y divide-slate-700">
              {assets.map((asset) => (
                <AssetRow key={asset.id} asset={asset} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// Вспомогательные компоненты
function StatCard({ label, value, color }) {
  const colors = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400'
  }

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className={`text-2xl font-bold ${colors[color]} mb-1`}>{value}</div>
      <div className="text-slate-400 text-xs">{label}</div>
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="p-8 text-center text-slate-500">
      {message}
    </div>
  )
}

function ReportRow({ report }) {
  const score = Math.round(report.compliance_score || 0)
  const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="px-6 py-4 hover:bg-slate-700/50 transition-colors">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-white font-medium">{report.client_organizations?.name}</h3>
          <p className="text-slate-400 text-xs mt-1">
            {new Date(report.generated_at).toLocaleDateString('ru-RU')}
          </p>
        </div>
        <div className={`text-xl font-bold ${scoreColor}`}>{score}%</div>
      </div>
      <div className="mt-2 flex gap-3 text-xs">
        <span className="text-slate-500">Всего: {report.total_checks}</span>
        <span className="text-emerald-400">✓ {report.passed}</span>
        <span className="text-red-400">✗ {report.failed}</span>
      </div>
    </div>
  )
}

function ClientRow({ client }) {
  const assetCount = client.environments?.reduce((acc, env) => acc + (env.assets?.length || 0), 0) || 0
  
  return (
    <div className="px-6 py-4 hover:bg-slate-700/50 transition-colors">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-white font-medium">{client.name}</h3>
          <p className="text-slate-400 text-xs">{client.industry} • {client.country}</p>
        </div>
        <div className="text-right">
          <span className="text-emerald-400 text-sm font-medium">{assetCount}</span>
          <p className="text-slate-500 text-xs">активов</p>
        </div>
      </div>
    </div>
  )
}

function AssetRow({ asset }) {
  const criticalityColors = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-emerald-500'
  }

  return (
    <div className="px-6 py-4 hover:bg-slate-700/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${criticalityColors[asset.criticality] || 'bg-slate-500'}`} />
          <div>
            <h3 className="text-white font-medium">{asset.hostname}</h3>
            <p className="text-slate-400 text-xs">{asset.ip_address} • {asset.os}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-slate-400 text-sm">{asset.environments?.client_organizations?.name}</span>
          <p className="text-slate-500 text-xs">{asset.asset_type}</p>
        </div>
      </div>
    </div>
  )
}