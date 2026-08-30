import { useEffect, useState } from "react";
import AppCard from "../components/ui/AppCard";
import StatCard from "../components/ui/StatCard";
import EmptyState from "../components/ui/EmptyState";
import OrgGate from "../components/OrgGate";
import { Skeleton } from "../components/ui/Skeleton";
import { useOrganization } from "../context/OrganizationContext";
import { getPoliciesByOrganization } from "../api/policies";

function getStatusTone(status) {
  switch (status) {
    case "active":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
    case "review":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300";
    case "draft":
      return "border-zinc-700 bg-zinc-800 text-zinc-300";
    case "archived":
      return "border-rose-500/20 bg-rose-500/10 text-rose-300";
    default:
      return "border-zinc-700 bg-zinc-800 text-zinc-300";
  }
}

function getStatusLabel(status) {
  switch (status) {
    case "active":
      return "Активна";
    case "review":
      return "На пересмотре";
    case "draft":
      return "Черновик";
    case "archived":
      return "Архив";
    default:
      return status || "—";
  }
}

export default function Policies() {
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
        const data = await getPoliciesByOrganization(selectedOrganizationId);
        setRows(data);
      } catch (error) {
        console.error("Ошибка загрузки политик:", error.message);
        setRows([]);
      } finally {
        setLoading(false);
      }
    }

    if (!orgLoading) {
      loadData();
    }
  }, [selectedOrganizationId, orgLoading]);

  const activeCount = rows.filter((item) => item.status === "active").length;
  const reviewCount = rows.filter((item) => item.status === "review").length;

  return (
    <OrgGate
      title="Политики"
      orgLoading={orgLoading}
      orgError={orgError}
      hasOrganizations={hasOrganizations}
    >
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Политики</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Политики и нормативные профили для{" "}
          <span className="text-white">{selectedOrganization?.name || "—"}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Всего политик" value={rows.length} loading={loading} hint="Нормативные профили организации" tone="info" />
        <StatCard label="Активные" value={activeCount} loading={loading} hint="Используются в текущем аудите" tone="success" />
        <StatCard label="На пересмотре" value={reviewCount} loading={loading} hint="Требуют согласования" tone="warning" />
      </div>

      <AppCard title="Реестр политик" subtitle="Политики выбранной организации">
        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Нет политик"
            description="Для выбранной организации в таблице policies пока нет записей."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {rows.map((item) => (
              <div key={item.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-base font-semibold text-white">{item.name}</div>
                    <div className="mt-1 text-sm text-zinc-400">{item.scope || "Без области применения"}</div>
                  </div>

                  <span className={`rounded-full border px-3 py-1 text-xs ${getStatusTone(item.status)}`}>
                    {getStatusLabel(item.status)}
                  </span>
                </div>

                <div className="mt-4 text-sm text-zinc-400">
                  {item.description || "Описание отсутствует"}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Владелец</div>
                    <div className="mt-1 text-sm text-zinc-200">{item.owner_name || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Источник</div>
                    <div className="mt-1 text-sm text-zinc-200">{item.source || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Создано</div>
                    <div className="mt-1 text-sm text-zinc-200">{item.created_at?.slice(0, 10) || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Обновлено</div>
                    <div className="mt-1 text-sm text-zinc-200">{item.updated_at?.slice(0, 10) || "—"}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AppCard>
    </div>
    </OrgGate>
  );
}