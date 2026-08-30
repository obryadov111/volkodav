import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAssetById } from "../api/assets";

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

function CheckStatusBadge({ value }) {
  const status = (value || "").toLowerCase();

  const classNameMap = {
    pass: "bg-green-500/20 text-green-300 border border-green-500/30",
    fail: "bg-red-500/20 text-red-300 border border-red-500/30",
    error: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
    skipped: "bg-zinc-700 text-zinc-300 border border-zinc-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
        classNameMap[status] || "bg-zinc-700 text-zinc-300 border border-zinc-600"
      }`}
    >
      {value || "unknown"}
    </span>
  );
}

export default function AssetDetails() {
  const params = useParams();
  const assetId = params.assetId || params.id || null;

  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAsset(currentAssetId) {
    try {
      setLoading(true);
      setError("");

      const data = await getAssetById(currentAssetId);
      setAsset(data);
    } catch (err) {
      console.error("Ошибка загрузки актива:", err);
      setError(err.message || "Не удалось загрузить актив");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!assetId) {
      setError("Не передан идентификатор актива");
      setLoading(false);
      return;
    }

    loadAsset(assetId);
  }, [assetId]);

  if (loading) {
    return (
      <div className="p-6 text-white">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-300">
          Загрузка актива...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-white">
        <div className="mb-4">
          <Link to="/assets" className="text-blue-400 hover:text-blue-300">
            ← Назад к списку активов
          </Link>
        </div>

        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
          {error}
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="p-6 text-white">
        <div className="mb-4">
          <Link to="/assets" className="text-blue-400 hover:text-blue-300">
            ← Назад к списку активов
          </Link>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-300">
          Актив не найден.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 text-white space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link to="/assets" className="text-blue-400 hover:text-blue-300 text-sm">
            ← Назад к списку активов
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{asset.hostname}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Подробная информация об активе
          </p>
        </div>

        <CriticalityBadge value={asset.criticality} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-sm text-zinc-400">IP address</div>
          <div className="mt-2 text-lg font-medium">{asset.ip_address || "—"}</div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-sm text-zinc-400">OS</div>
          <div className="mt-2 text-lg font-medium">{asset.os || "—"}</div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-sm text-zinc-400">Environment</div>
          <div className="mt-2 text-lg font-medium">{asset.environment_name || "—"}</div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-sm text-zinc-400">Asset type</div>
          <div className="mt-2 text-lg font-medium">{asset.asset_type || "—"}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-sm text-zinc-400">Software count</div>
          <div className="mt-2 text-2xl font-semibold">{asset.software_count ?? 0}</div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-sm text-zinc-400">Checks count</div>
          <div className="mt-2 text-2xl font-semibold">{asset.checks_count ?? 0}</div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-sm text-zinc-400">Failed checks</div>
          <div className="mt-2 text-2xl font-semibold">{asset.failed_checks_count ?? 0}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-4 py-3">
          <h2 className="text-lg font-semibold">Installed software</h2>
        </div>

        {asset.software?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-950 text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Type</th>
                </tr>
              </thead>
              <tbody>
                {asset.software.map((item) => (
                  <tr key={item.id} className="border-t border-zinc-800">
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-zinc-300">{item.version || "—"}</td>
                    <td className="px-4 py-3 text-zinc-300">{item.vendor || "—"}</td>
                    <td className="px-4 py-3 text-zinc-300">{item.category || "—"}</td>
                    <td className="px-4 py-3 text-zinc-300">{item.type || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-6 text-zinc-400">ПО для этого актива не найдено.</div>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-4 py-3">
          <h2 className="text-lg font-semibold">Hardening checks</h2>
        </div>

        {asset.checks?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-950 text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Check ID</th>
                  <th className="px-4 py-3">Rule ID</th>
                  <th className="px-4 py-3">Actual value</th>
                  <th className="px-4 py-3">Expected value</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Checked at</th>
                </tr>
              </thead>
              <tbody>
                {asset.checks.map((item) => (
                  <tr key={item.id} className="border-t border-zinc-800">
                    <td className="px-4 py-3 text-zinc-300">{item.id}</td>
                    <td className="px-4 py-3 text-zinc-300">{item.rule_id || "—"}</td>
                    <td className="px-4 py-3 text-zinc-300">{item.actual_value || "—"}</td>
                    <td className="px-4 py-3 text-zinc-300">{item.expected_value || "—"}</td>
                    <td className="px-4 py-3">
                      <CheckStatusBadge value={item.status} />
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {item.checked_at ? new Date(item.checked_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-6 text-zinc-400">Проверки для этого актива не найдены.</div>
        )}
      </div>
    </div>
  );
}
