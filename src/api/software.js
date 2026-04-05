import { apiFetch } from "./client";

export async function getSoftwareByOrganization(organizationId) {
  return apiFetch(`/organizations/${organizationId}/software`);
}

export async function getSoftwareByAsset(assetId) {
  return apiFetch(`/assets/${assetId}/software`);
}