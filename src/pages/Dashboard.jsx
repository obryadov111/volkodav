import { useEffect, useState } from "react";
import AppCard from "../components/ui/AppCard";
import StatCard from "../components/ui/StatCard";
import EmptyState from "../components/ui/EmptyState";
import OrgGate from "../components/OrgGate";
import { Skeleton, SkeletonTable } from "../components/ui/Skeleton";
import { useOrganization } from "../context/OrganizationContext";
import { getDashboardSummary } from "../api/dashboard";

const EMPTY_SUMMARY = {
  assetsCount: 0,
  softwareCount: 0,
  checksCount: 0,
  failedChecks: 0,
  reportsCount: 0,
  latestReport: null,
  environmentsCount: 0,
  criticalAssets: 0,
};

export default function Dashboard() {
  const {
    selectedOrganization,
    selectedOrganizationId,
    loading: orgLoading,
    hasOrganizations,
    error: orgError,
  } = useOrganization();

  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!selectedOrganizationId) {
        setSummary(EMPTY_SUMMARY);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getDashboardSummary(selectedOrganizationId);
        setSummary(data);
      } catch (error) {
        console.error("Ошибка загрузки dashboard:", error.message);
        setSummary(EMPTY_SUMMARY);
      } finally {
        setLoading(false);
      }
    }

    if (!orgLoading) {
      loadData();
    }
  }, [selectedOrganizationId, orgLoading]);

  const hasAnyData =
    summary.assetsCount > 0 ||
    summary.softwareCount > 0 ||
    summary.checksCount > 0 ||
    summary.reportsCount > 0 ||
    summary.environmentsCount > 0;

  return (
    <OrgGate
      title="Обзор"
      orgLoading={orgLoading}
      orgError={orgError}
      hasOrganizations={hasOrganizations}
    >
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Обзор</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Сводка по организации{" "}
          <span className="text-white">{selectedOrganization?.name || "—"}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Активы"
          value={summary.assetsCount}
          loading={loading}
          hint="Обнаруженные узлы инфраструктуры"
          tone="info"
        />
        <StatCard
          label="ПО"
          value={summary.softwareCount}
          loading={loading}
          hint="Инвентаризация программного обеспечения"
          tone="default"
        />
        <StatCard
          label="Проверки"
          value={summary.checksCount}
          loading={loading}
          hint="Всего выполненных hardening-checks"
          tone="default"
        />
        <StatCard
          label="Нарушения"
          value={summary.failedChecks}
          loading={loading}
          hint="Проваленные проверки"
          tone="danger"
        />
      </div>

      {!loading && !hasAnyData ? (
        <EmptyState
          title="Нет данных по организации"
          description="Организация выбрана, но связанные данные в БД пока отсутствуют."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          <AppCard
            title="Состояние инфраструктуры"
            subtitle="Ключевые показатели выбранной организации"
            className="xl:col-span-2"
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                <div className="text-sm text-zinc-400">Контуры</div>
                {loading ? (
                  <Skeleton className="mt-2 h-8 w-12" />
                ) : (
                  <div className="mt-2 text-3xl font-semibold text-white">
                    {summary.environmentsCount}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                <div className="text-sm text-zinc-400">Критичные активы</div>
                {loading ? (
                  <Skeleton className="mt-2 h-8 w-12" />
                ) : (
                  <div className="mt-2 text-3xl font-semibold text-rose-300">
                    {summary.criticalAssets}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                <div className="text-sm text-zinc-400">Сохранённые отчёты</div>
                {loading ? (
                  <Skeleton className="mt-2 h-8 w-12" />
                ) : (
                  <div className="mt-2 text-3xl font-semibold text-white">
                    {summary.reportsCount}
                  </div>
                )}
              </div>
            </div>
          </AppCard>

          <AppCard title="Последний отчёт" subtitle="Итог последнего сканирования">
            {loading ? (
              <SkeletonTable rows={3} cols={2} />
            ) : summary.latestReport ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                  <div className="text-sm text-zinc-400">Compliance Score</div>
                  <div className="mt-2 text-3xl font-semibold text-blue-300">
                    {Math.round(summary.latestReport.compliance_score || 0)}%
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3">
                    <span className="text-sm text-zinc-400">Дата</span>
                    <span className="text-sm text-white">
                      {summary.latestReport.generated_at?.slice(0, 10) || "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3">
                    <span className="text-sm text-zinc-400">Всего проверок</span>
                    <span className="text-sm text-white">
                      {summary.latestReport.total_checks ?? 0}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3">
                    <span className="text-sm text-zinc-400">Failed</span>
                    <span className="text-sm text-rose-300">
                      {summary.latestReport.failed ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-zinc-500">
                Отчётов пока нет, но остальные данные загружены.
              </div>
            )}
          </AppCard>
        </div>
      )}
    </div>
    </OrgGate>
  );
}