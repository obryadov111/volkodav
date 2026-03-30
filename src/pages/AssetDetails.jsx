import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AppCard from "../components/ui/AppCard";
import StatCard from "../components/ui/StatCard";
import { getAssetById } from "../api/assets";
import { getSoftwareByAsset } from "../api/software";
import { getHardeningByAsset } from "../api/hardening";

export default function AssetDetails() {
  const { id } = useParams();

  const [asset, setAsset] = useState(null);
  const [software, setSoftware] = useState([]);
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!id) return;

      try {
        setLoading(true);

        const [assetData, softwareData, checksData] = await Promise.all([
          getAssetById(id),
          getSoftwareByAsset(id),
          getHardeningByAsset(id),
        ]);

        setAsset(assetData);
        setSoftware(softwareData);
        setChecks(checksData);
      } catch (error) {
        console.error("Ошибка загрузки карточки актива:", error.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const passedChecks = checks.filter((item) => item.status === "pass").length;
  const failedChecks = checks.filter((item) => item.status === "fail").length;

  if (loading) {
    return <div className="text-zinc-400">Загрузка...</div>;
  }

  if (!asset) {
    return <div className="text-zinc-500">Актив не найден</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">{asset.hostname}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Детальная карточка актива и связанные результаты аудита
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="IP" value={asset.ip_address || "—"} hint="Сетевой адрес" tone="info" />
        <StatCard label="ОС" value={asset.os || "—"} hint="Операционная система" tone="default" />
        <StatCard label="ПО" value={software.length} hint="Привязанные программные компоненты" tone="default" />
        <StatCard label="Failed checks" value={failedChecks} hint="Нарушения по активу" tone="danger" />
      </div>

      <AppCard title="Общая информация" subtitle="Параметры выбранного актива">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Hostname</div>
            <div className="mt-2 text-base font-medium text-white">{asset.hostname}</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Тип</div>
            <div className="mt-2 text-base font-medium text-white">{asset.asset_type || "—"}</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Criticality</div>
            <div className="mt-2 text-base font-medium text-white">{asset.criticality || "—"}</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Контур</div>
            <div className="mt-2 text-base font-medium text-white">{asset.environment?.name || "—"}</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Дата добавления</div>
            <div className="mt-2 text-base font-medium text-white">{asset.created_at?.slice(0, 10) || "—"}</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Passed / Failed</div>
            <div className="mt-2 text-base font-medium text-white">
              {passedChecks} / {failedChecks}
            </div>
          </div>
        </div>
      </AppCard>

      <AppCard title="Инвентаризация ПО" subtitle="Компоненты, обнаруженные на активе">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-zinc-800 text-left text-zinc-400">
              <tr>
                <th className="px-4 py-3">Название</th>
                <th className="px-4 py-3">Версия</th>
                <th className="px-4 py-3">Вендор</th>
                <th className="px-4 py-3">Категория</th>
                <th className="px-4 py-3">Тип</th>
              </tr>
            </thead>
            <tbody>
              {software.map((item) => (
                <tr key={item.id} className="border-b border-zinc-800/60 text-zinc-200">
                  <td className="px-4 py-3 font-medium text-white">{item.name}</td>
                  <td className="px-4 py-3">{item.version || "—"}</td>
                  <td className="px-4 py-3">{item.vendor || "—"}</td>
                  <td className="px-4 py-3">{item.category || "—"}</td>
                  <td className="px-4 py-3">{item.type || "—"}</td>
                </tr>
              ))}
              {!software.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                    ПО для этого актива не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AppCard>

      <AppCard title="Hardening checks" subtitle="Проверки безопасности по активу">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-zinc-800 text-left text-zinc-400">
              <tr>
                <th className="px-4 py-3">Rule</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Actual</th>
                <th className="px-4 py-3">Expected</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((item) => (
                <tr key={item.id} className="border-b border-zinc-800/60 text-zinc-200">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{item.rule?.title || "—"}</div>
                    <div className="text-xs text-zinc-500">{item.rule?.rule_code || "—"}</div>
                  </td>
                  <td className="px-4 py-3">{item.rule?.severity || "—"}</td>
                  <td className="px-4 py-3">{item.actual_value || "—"}</td>
                  <td className="px-4 py-3">{item.expected_value || item.rule?.expected_value || "—"}</td>
                  <td className="px-4 py-3">{item.status || "—"}</td>
                </tr>
              ))}
              {!checks.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                    Для актива пока нет результатов проверок
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AppCard>
    </div>
  );
}