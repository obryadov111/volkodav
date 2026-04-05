import { apiFetch } from "./client";

export async function getScansByOrganization(organizationId) {
  return apiFetch(`/organizations/${organizationId}/scans`);
}