import { useEffect, useMemo, useState } from "react";
import AppCard from "../components/ui/AppCard";
import StatCard from "../components/ui/StatCard";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import { useOrganization } from "../context/OrganizationContext";
import { getReportsByOrganization } from "../api/reports";

export default function Report() {
  const {
    selectedOrganization,
    selectedOrganizationId,
    loading: orgLoading,
    hasOrganizations,
    error: orgError,
  } = useOrganization();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!selectedOrganizationId) {
        setReports([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getReportsByOrganization(selectedOrganizationId);
        setReports(data);
      } catch (error) {
        console.error("Ошибка загрузки отчётов:", error.message);
        setReports([]);
      } finally {
        setLoading(false);
      }
    }

    if (!orgLoading) {
      loadData();
    }
  }, [selectedOrganizationId, orgLoading]);

  const latest = reports[0] || null;

  const avgScore = useMemo(() => {
    if (!reports.length) return 0;
    const total = reports.reduce((sum, item) => sum + (item.compliance_score || 0), 0);
    return Math.round(total / reports.length);
  }, [reports]);

  if (orgLoading) {
    return <div className="text-zinc-400">Загрузка организаций...</div>;
  }

  if (orgError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Отчёты</h1>
        <ErrorState title="Ошибка подключения к БД" description={orgError} />
      </div>
    );
  }

  if (!hasOrganizations) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Отчёты</h1>
        <EmptyState
          title="Нет организаций"
          description="Таблица client_organizations пустая. Сначала добавь хотя бы одну организацию."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Отчёты</h1>
        <p className="mt-1 text-sm text-zinc-400">
          История отчётов по организации{" "}
          <span className="text-white">{selectedOrganization?.name || "—"}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Последний Score"
          value={loading ? "..." : latest ? `${Math.round(latest.compliance_score || 0)}%` : "—"}
          hint="Последний рассчитанный показатель"
          tone="info"
        />
        <StatCard label="Пройдено" value={loading ? "..." : latest?.passed ?? "—"} hint="Успешные проверки" tone="success" />
        <StatCard label="Нарушения" value={loading ? "..." : latest?.failed ?? "—"} hint="Проваленные проверки" tone="danger" />
        <StatCard label="Средний Score" value={loading ? "..." : `${avgScore}%`} hint="Среднее по отчётам" tone="default" />
      </div>

      <AppCard title="История отчётов" subtitle="Отчёты по выбранной организации">
        {loading ? (
          <div className="text-zinc-400">Загрузка...</div>
        ) : reports.length === 0 ? (
          <EmptyState
            title="Нет отчётов"
            description="Для выбранной организации в таблице hardening_reports пока нет записей."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-zinc-800 text-left text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Дата</th>
                  <th className="px-4 py-3">Всего проверок</th>
                  <th className="px-4 py-3">Passed</th>
                  <th className="px-4 py-3">Failed</th>
                  <th className="px-4 py-3">Score</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-800/60 text-zinc-200 hover:bg-zinc-800/40">
                    <td className="px-4 py-3">{item.generated_at?.slice(0, 10) || "—"}</td>
                    <td className="px-4 py-3">{item.total_checks ?? 0}</td>
                    <td className="px-4 py-3">{item.passed ?? 0}</td>
                    <td className="px-4 py-3">{item.failed ?? 0}</td>
                    <td className="px-4 py-3 font-medium text-white">{Math.round(item.compliance_score || 0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AppCard>
    </div>
  );
}