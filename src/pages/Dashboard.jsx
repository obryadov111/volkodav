import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Dashboard() {
  const [clients, setClients] = useState([])
  const [reports, setReports] = useState([])
  const [stats, setStats] = useState({ total: 0, passed: 0, failed: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [
      { data: clientsData },
      { data: reportsData },
      { data: checksData }
    ] = await Promise.all([
      supabase.from('client_organizations').select('*'),
      supabase.from('hardening_reports').select('*, client_organizations(name)').limit(5),
      supabase.from('hardening_checks').select('status')
    ])

    setClients(clientsData || [])
    setReports(reportsData || [])
    
    const checks = checksData || []
    setStats({
      total: checks.length,
      passed: checks.filter(c => c.status === 'pass').length,
      failed: checks.filter(c => c.status === 'fail').length
    })
    
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="text-3xl font-bold text-emerald-400 mb-1">{clients.length}</div>
          <div className="text-slate-400 text-sm">Клиентов</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="text-3xl font-bold text-blue-400 mb-1">{stats.total}</div>
          <div className="text-slate-400 text-sm">Проверок</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="text-3xl font-bold text-emerald-400 mb-1">{stats.passed}</div>
          <div className="text-slate-400 text-sm">Пройдено</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="text-3xl font-bold text-red-400 mb-1">{stats.failed}</div>
          <div className="text-slate-400 text-sm">Отклонений</div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Последние отчёты</h2>
          </div>
          <div className="divide-y divide-slate-700">
            {reports.map(r => (
              <div key={r.id} className="px-6 py-4 hover:bg-slate-700/50 transition-colors">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white font-medium">{r.client_organizations?.name}</p>
                    <p className="text-sm text-slate-400">
                      {new Date(r.generated_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className={`text-2xl font-bold ${
                    (r.compliance_score || 0) >= 80 ? 'text-emerald-400' : 
                    (r.compliance_score || 0) >= 50 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {Math.round(r.compliance_score || 0)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Клиенты</h2>
          </div>
          <div className="divide-y divide-slate-700">
            {clients.slice(0, 5).map(c => (
              <div key={c.id} className="px-6 py-4 hover:bg-slate-700/50 transition-colors">
                <p className="text-white font-medium">{c.name}</p>
                <p className="text-sm text-slate-400">{c.industry} • {c.country}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}