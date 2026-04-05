import { apiDownload, apiFetch } from "./client";

export async function getSnapshotExportDownloadUrl(path, expiresIn = 60) {
  const query = new URLSearchParams({
    path,
    expires_in: String(expiresIn),
  });

  const data = await apiFetch(`/exports/download-url?${query.toString()}`);
  return data.signed_url || data.url || null;
}

export async function generateAndStoreSnapshotExport(snapshotId, format) {
  const data = await apiFetch(`/exports/snapshots/${snapshotId}`, {
    method: "POST",
    body: JSON.stringify({ format }),
  });

  return data.path;
}

export async function downloadSnapshotExport(snapshotId, format) {
  return apiDownload(`/exports/snapshots/${snapshotId}/download?format=${encodeURIComponent(format)}`);
}