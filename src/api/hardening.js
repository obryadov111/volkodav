import { apiFetch } from "./client";

export async function getHardeningByOrganization(organizationId) {
  return apiFetch(`/organizations/${organizationId}/hardening`);
}

export async function getHardeningByAsset(assetId) {
  return apiFetch(`/assets/${assetId}/hardening`);
}