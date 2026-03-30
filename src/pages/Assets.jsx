import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppCard from "../components/ui/AppCard";
import StatCard from "../components/ui/StatCard";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import { useOrganization } from "../context/OrganizationContext";
import { getAssetsByOrganization } from "../api/assets";

export default function Assets() {
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
        const data = await getAssetsByOrganization(selectedOrganizationId);
        setRows(data);
      } catch (error) {
        console.error("Ошибка загрузки активов:", error.message);
        setRows([]);
      } finally {
        setLoading(false);
      }
    }

    if (!orgLoading) {
      loadData();
    }
  }, [selectedOrganizationId, orgLoading]);

  if (orgLoading) {
    return <div className="text-zinc-400">Загрузка организаций...</div>;
  }

  if (orgError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Активы</h1>
        <ErrorState title="Ошибка подключения к БД" description={orgError} />
      </div>
    );
  }

  if (!hasOrganizations) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Активы</h1>
        <EmptyState
          title="Нет организаций"
          description="Таблица client_organizations пустая. Сначала добавь хотя бы одну организацию."
        />
      </div>
    );
  }

  const criticalCount = rows.filter((item) => item.criticality === "critical").length;
  const highCount = rows.filter((item) => item.criticality === "high").length;
  const osCount = [...new Set(rows.map((item) => item.os).filter(Boolean))].length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Активы</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Инвентаризация инфраструктуры по организации{" "}
          <span className="text-white">{selectedOrganization?.name || "—"}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Всего активов" value={loading ? "..." : rows.length} hint="Все обнаруженные хосты" tone="info" />
        <StatCard label="Critical" value={loading ? "..." : criticalCount} hint="Максимальный приоритет" tone="danger" />
        <StatCard label="High" value={loading ? "..." : highCount} hint="Повышенный риск" tone="warning" />
        <StatCard label="ОС" value={loading ? "..." : osCount} hint="Уникальные платформы" tone="default" />
      </div>

      <AppCard title="Список активов" subtitle="Хосты и узлы выбранной организации">
        {loading ? (
          <div className="text-zinc-400">Загрузка...</div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Нет активов"
            description="Для выбранной организации в таблице assets пока нет записей."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-zinc-800 text-left text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Hostname</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">ОС</th>
                  <th className="px-4 py-3">Тип</th>
                  <th className="px-4 py-3">Criticality</th>
                  <th className="px-4 py-3">Контур</th>
                  <th className="px-4 py-3">Детали</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-zinc-800/60 text-zinc-200 transition hover:bg-zinc-800/40"
                  >
                    <td className="px-4 py-3 font-medium text-white">{item.hostname}</td>
                    <td className="px-4 py-3">{item.ip_address || "—"}</td>
                    <td className="px-4 py-3">{item.os || "—"}</td>
                    <td className="px-4 py-3">{item.asset_type || "—"}</td>
                    <td className="px-4 py-3">{item.criticality || "—"}</td>
                    <td className="px-4 py-3">{item.environment?.name || "—"}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/assets/${item.id}`}
                        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-white hover:bg-zinc-800"
                      >
                        Открыть
                      </Link>
                    </td>
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