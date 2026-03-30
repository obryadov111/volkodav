import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppCard from "../components/ui/AppCard";
import StatCard from "../components/ui/StatCard";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import { useOrganization } from "../context/OrganizationContext";
import { getSnapshotsByOrganization } from "../api/snapshots";
import {
  generateAndStoreSnapshotExport,
  getSnapshotExportDownloadUrl,
} from "../api/exports";

function getStatusBadgeClass(status) {
  switch (status) {
    case "completed":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
    case "processing":
      return "border-blue-500/20 bg-blue-500/10 text-blue-300";
    case "pending":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300";
    case "failed":
      return "border-rose-500/20 bg-rose-500/10 text-rose-300";
    default:
      return "border-zinc-700 bg-zinc-800 text-zinc-300";
  }
}

function getStatusLabel(status) {
  switch (status) {
    case "completed":
      return "Завершён";
    case "processing":
      return "В обработке";
    case "pending":
      return "Ожидает";
    case "failed":
      return "Ошибка";
    default:
      return status || "—";
  }
}

export default function Scans() {
  const {
    selectedOrganization,
    selectedOrganizationId,
    loading: orgLoading,
    hasOrganizations,
    error: orgError,
  } = useOrganization();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!selectedOrganizationId) {
        setRows([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getSnapshotsByOrganization(selectedOrganizationId);
        setRows(data);
      } catch (error) {
        console.error("Ошибка загрузки snapshots:", error.message);
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
    const total = rows.length;
    const completed = rows.filter((item) => item.status === "completed").length;
    const failed = rows.filter((item) => item.status === "failed").length;
    const latest = rows[0] || null;

    return { total, completed, failed, latest };
  }, [rows]);

  async function openStoredExport(path) {
    const url = await getSnapshotExportDownloadUrl(path, 120);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleExport(snapshot, format) {
    const key = `${snapshot.id}-${format}`;
    setBusyKey(key);

    try {
      const existingPath =
        format === "pdf"
          ? snapshot.exported_pdf_path
          : snapshot.exported_excel_path;

      let path = existingPath;

      if (!path) {
        path = await generateAndStoreSnapshotExport(snapshot.id, format);

        setRows((prev) =>
          prev.map((row) =>
            row.id === snapshot.id
              ? {
                  ...row,
                  exported_pdf_path:
                    format === "pdf" ? path : row.exported_pdf_path,
                  exported_excel_path:
                    format === "excel" ? path : row.exported_excel_path,
                }
              : row
          )
        );
      }

      await openStoredExport(path);
    } catch (error) {
      console.error(`Ошибка экспорта ${format}:`, error.message);
      alert(`Не удалось сформировать ${format.toUpperCase()}.\n${error.message}`);
    } finally {
      setBusyKey("");
    }
  }

  if (orgLoading) {
    return <div className="text-zinc-400">Загрузка организаций...</div>;
  }

  if (orgError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Сканирования</h1>
        <ErrorState title="Ошибка подключения к БД" description={orgError} />
      </div>
    );
  }

  if (!hasOrganizations) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Сканирования</h1>
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
        <h1 className="text-2xl font-semibold text-white">Сканирования</h1>
        <p className="mt-1 text-sm text-zinc-400">
          История snapshot-сканов по организации{" "}
          <span className="text-white">{selectedOrganization?.name || "—"}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Всего snapshot" value={loading ? "..." : stats.total} hint="История сканирований" tone="info" />
        <StatCard label="Завершено" value={loading ? "..." : stats.completed} hint="Успешно обработанные" tone="success" />
        <StatCard label="Ошибки" value={loading ? "..." : stats.failed} hint="Неудачные запуски" tone="danger" />
        <StatCard
          label="Последний score"
          value={
            loading
              ? "..."
              : stats.latest?.compliance_score != null
                ? `${Math.round(stats.latest.compliance_score)}%`
                : "—"
          }
          hint="Последний snapshot"
          tone="default"
        />
      </div>

      <AppCard title="История snapshot-сканов" subtitle="Сравнение и экспорт по каждому запуску">
        {loading ? (
          <div className="text-zinc-400">Загрузка...</div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Нет сканирований"
            description="Для выбранной организации в таблице scan_snapshots пока нет записей."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-zinc-800 text-left text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Snapshot</th>
                  <th className="px-4 py-3">Дата</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Активы</th>
                  <th className="px-4 py-3">ПО</th>
                  <th className="px-4 py-3">Checks</th>
                  <th className="px-4 py-3">Failed</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">PDF</th>
                  <th className="px-4 py-3">Excel</th>
                  <th className="px-4 py-3">Сравнить</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item, index) => {
                  const previous = rows[index + 1] || null;
                  const pdfBusy = busyKey === `${item.id}-pdf`;
                  const excelBusy = busyKey === `${item.id}-excel`;

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-zinc-800/60 text-zinc-200 transition hover:bg-zinc-800/40"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">
                          {item.snapshot_label || `Snapshot #${item.scan_number}`}
                        </div>
                        {item.notes ? (
                          <div className="mt-1 text-xs text-zinc-500">{item.notes}</div>
                        ) : null}
                      </td>

                      <td className="px-4 py-3">
                        {item.created_at ? item.created_at.slice(0, 16).replace("T", " ") : "—"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs ${getStatusBadgeClass(
                            item.status
                          )}`}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                      </td>

                      <td className="px-4 py-3">{item.total_assets ?? 0}</td>
                      <td className="px-4 py-3">{item.total_software ?? 0}</td>
                      <td className="px-4 py-3">{item.total_checks ?? 0}</td>
                      <td className="px-4 py-3">{item.failed ?? 0}</td>
                      <td className="px-4 py-3 font-medium text-white">
                        {item.compliance_score != null ? `${Math.round(item.compliance_score)}%` : "—"}
                      </td>

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={pdfBusy}
                          onClick={() => handleExport(item, "pdf")}
                          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-white hover:bg-zinc-800 disabled:opacity-50"
                        >
                          {pdfBusy ? "..." : item.exported_pdf_path ? "Открыть PDF" : "Создать PDF"}
                        </button>
                      </td>

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={excelBusy}
                          onClick={() => handleExport(item, "excel")}
                          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-white hover:bg-zinc-800 disabled:opacity-50"
                        >
                          {excelBusy ? "..." : item.exported_excel_path ? "Открыть Excel" : "Создать Excel"}
                        </button>
                      </td>

                      <td className="px-4 py-3">
                        {previous ? (
                          <Link
                            to={`/scan-compare?before=${previous.id}&after=${item.id}`}
                            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-white hover:bg-zinc-800"
                          >
                            Сравнить
                          </Link>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AppCard>
    </div>
  );
}