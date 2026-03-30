import { supabase } from '../supabase'
import { crypto } from '../services/crypto'

export const dashboardApi = {
  // Получить текущего пользователя из токена
  getCurrentUser() {
    const session = crypto.getSession()
    if (!session) return null
    return crypto.getTokenData(session.access_token)
  },

  // Загрузить клиентов организации
  async getClients(organizationId) {
    const { data, error } = await supabase
      .from('client_organizations')
      .select(`
        id,
        name,
        industry,
        country,
        created_at,
        environments (
          id,
          name,
          assets (
            id,
            criticality
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // Загрузить отчёты харденинга
  async getReports(organizationId, limit = 10) {
    const { data, error } = await supabase
      .from('hardening_reports')
      .select(`
        id,
        organization_id,
        total_checks,
        passed,
        failed,
        compliance_score,
        generated_at,
        client_organizations (
          id,
          name,
          industry
        )
      `)
      .order('generated_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  },

  // Загрузить активы с фильтрацией по критичности
  async getAssets(filters = {}) {
    let query = supabase
      .from('assets')
      .select(`
        id,
        hostname,
        ip_address,
        os,
        asset_type,
        criticality,
        created_at,
        environments (
          id,
          name,
          client_organizations (
            id,
            name
          )
        )
      `)

    if (filters.criticality) {
      query = query.eq('criticality', filters.criticality)
    }

    if (filters.environmentId) {
      query = query.eq('environment_id', filters.environmentId)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return data || []
  },

  // Получить статистику для dashboard
  async getStats(organizationId) {
    // Общее количество проверок
    const { count: totalChecks } = await supabase
      .from('hardening_checks')
      .select('*', { count: 'exact', head: true })

    // По статусам
    const { data: checksByStatus } = await supabase
      .from('hardening_checks')
      .select('status')
    
    const stats = {
      total: totalChecks || 0,
      passed: checksByStatus?.filter(c => c.status === 'pass').length || 0,
      failed: checksByStatus?.filter(c => c.status === 'fail').length || 0,
      error: checksByStatus?.filter(c => c.status === 'error').length || 0,
      skipped: checksByStatus?.filter(c => c.status === 'skipped').length || 0
    }

    return stats
  },

  // Создать новый отчёт (только для админов/аудиторов)
  async createReport(reportData) {
    const user = this.getCurrentUser()
    
    // Проверка прав
    if (!user?.permissions?.includes('create:reports')) {
      throw new Error('Недостаточно прав')
    }

    const { data, error } = await supabase
      .from('hardening_reports')
      .insert({
        organization_id: reportData.organizationId,
        total_checks: reportData.totalChecks,
        passed: reportData.passed,
        failed: reportData.failed,
        compliance_score: reportData.complianceScore,
        generated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}