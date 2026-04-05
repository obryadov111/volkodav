import { apiFetch } from "./client";

export async function getAssetsByOrganization(organizationId) {
  return apiFetch(`/organizations/${organizationId}/assets`);
}

export async function getAssetById(assetId) {
  return apiFetch(`/assets/${assetId}`);
}