import { apiFetch } from "./client";

export async function getReportsByOrganization(organizationId) {
  return apiFetch(`/organizations/${organizationId}/reports`);
}