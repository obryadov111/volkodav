import { useEffect, useMemo, useState } from "react";
import AppCard from "../components/ui/AppCard";
import StatCard from "../components/ui/StatCard";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import { useOrganization } from "../context/OrganizationContext";
import { getHardeningByOrganization } from "../api/hardening";

export default function Hardening() {
  const {
    selectedOrganization,
    selectedOrganizationId,
    loading: orgLoading,
    hasOrganizations,
    error: orgError,
  } = useOrganization();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!selectedOrganizationId) {
        setRows([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getHardeningByOrganization(selectedOrganizationId);
        setRows(data);
      } catch (error) {
        console.error("Ошибка загрузки hardening checks:", error.message);
        setRows([]);
      } finally {
        setLoading(false);
      }
    }

    if (!orgLoading) {
      loadData();
    }
  }, [selectedOrganizationId, orgLoading]);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      passed: rows.filter((item) => item.status === "pass").length,
      failed: rows.filter((item) => item.status === "fail").length,
      critical: rows.filter((item) => item.rule?.severity === "critical").length,
    };
  }, [rows]);

  if (orgLoading) {
    return <div className="text-zinc-400">Загрузка организаций...</div>;
  }

  if (orgError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Харденинг</h1>
        <ErrorState title="Ошибка подключения к БД" description={orgError} />
      </div>
    );
  }

  if (!hasOrganizations) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Харденинг</h1>
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
        <h1 className="text-2xl font-semibold text-white">Харденинг</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Результаты hardening-checks по организации{" "}
          <span className="text-white">{selectedOrganization?.name || "—"}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Всего проверок" value={loading ? "..." : stats.total} hint="Проверки по активам" tone="info" />
        <StatCard label="Passed" value={loading ? "..." : stats.passed} hint="Успешно выполнены" tone="success" />
        <StatCard label="Failed" value={loading ? "..." : stats.failed} hint="Требуют исправления" tone="danger" />
        <StatCard label="Critical rules" value={loading ? "..." : stats.critical} hint="Критичные проверки" tone="warning" />
      </div>

      <AppCard title="Результаты проверок" subtitle="Проверки по активам и правилам">
        {loading ? (
          <div className="text-zinc-400">Загрузка...</div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Нет результатов проверок"
            description="Для выбранной организации в таблице hardening_checks пока нет записей."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-zinc-800 text-left text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Актив</th>
                  <th className="px-4 py-3">Правило</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Actual</th>
                  <th className="px-4 py-3">Expected</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Дата</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-zinc-800/60 text-zinc-200 transition hover:bg-zinc-800/40"
                  >
                    <td className="px-4 py-3 font-medium text-white">
                      {item.asset?.hostname || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{item.rule?.title || "—"}</div>
                      <div className="text-xs text-zinc-500">{item.rule?.rule_code || "—"}</div>
                    </td>
                    <td className="px-4 py-3">{item.rule?.severity || "—"}</td>
                    <td className="px-4 py-3">{item.actual_value || "—"}</td>
                    <td className="px-4 py-3">{item.expected_value || item.rule?.expected_value || "—"}</td>
                    <td className="px-4 py-3">{item.status || "—"}</td>
                    <td className="px-4 py-3">{item.checked_at?.slice(0, 10) || "—"}</td>
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