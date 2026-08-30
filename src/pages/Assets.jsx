import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAssetsByOrganization } from "../api/assets";
import { useOrganization } from "../context/OrganizationContext";

function CriticalityBadge({ value }) {
  const criticality = (value || "").toLowerCase();

  const classNameMap = {
    critical: "bg-red-500/20 text-red-300 border border-red-500/30",
    high: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
    low: "bg-green-500/20 text-green-300 border border-green-500/30",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
        classNameMap[criticality] || "bg-zinc-700 text-zinc-200 border border-zinc-600"
      }`}
    >
      {value || "unknown"}
    </span>
  );
}

export default function Assets() {
  const { selectedOrganization } = useOrganization();

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function loadAssets(showRefreshState = false) {
    if (!selectedOrganization?.id) {
      setAssets([]);
      setLoading(false);
      return;
    }

    try {
      setError("");

      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await getAssetsByOrganization(selectedOrganization.id);
      setAssets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Ошибка загрузки активов:", err);
      setError(err.message || "Не удалось загрузить активы");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAssets();
  }, [selectedOrganization?.id]);

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) {
      return assets;
    }

    return assets.filter((asset) => {
      return [
        asset.hostname,
        asset.ip_address,
        asset.os,
        asset.asset_type,
        asset.criticality,
        asset.environment_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [assets, search]);

  if (!selectedOrganization?.id) {
    return (
      <div className="p-6 text-zinc-300">
        <h1 className="text-2xl font-semibold mb-2">Assets</h1>
        <p>Сначала выбери организацию.</p>
      </div>
    );
  }

  return (
    <div className="p-6 text-white">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Assets</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Организация: {selectedOrganization.name || "Без названия"}
          </p>
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Поиск по hostname, IP, OS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white outline-none ring-1 ring-zinc-800 focus:ring-blue-500"
          />

          <button
            type="button"
            onClick={() => loadAssets(true)}
            disabled={refreshing}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-60"
          >
            {refreshing ? "Обновляем..." : "Обновить"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-300">
          Загрузка активов...
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-300">
          Для выбранной организации активы не найдены.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-950 text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Hostname</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">OS</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Criticality</th>
                  <th className="px-4 py-3">Environment</th>
                  <th className="px-4 py-3">Software</th>
                  <th className="px-4 py-3">Failed checks</th>
                </tr>
              </thead>

              <tbody>
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="border-t border-zinc-800">
                    <td className="px-4 py-3 font-medium">
			  <Link
			    to={`/assets/${asset.id}`}
			    className="text-blue-400 hover:text-blue-300 hover:underline"
			  >
			    {asset.hostname}
			  </Link>
		    </td>
                    <td className="px-4 py-3 text-zinc-300">{asset.ip_address || "—"}</td>
                    <td className="px-4 py-3 text-zinc-300">{asset.os || "—"}</td>
                    <td className="px-4 py-3 text-zinc-300">{asset.asset_type || "—"}</td>
                    <td className="px-4 py-3">
                      <CriticalityBadge value={asset.criticality} />
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {asset.environment_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{asset.software_count ?? 0}</td>
                    <td className="px-4 py-3 text-zinc-300">{asset.failed_checks_count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-zinc-800 px-4 py-3 text-sm text-zinc-400">
            Всего активов: {filteredAssets.length}
          </div>
        </div>
      )}
    </div>
  );
}
