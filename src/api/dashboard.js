import { apiFetch } from "./client";

export async function getDashboardSummary(organizationId) {
  return apiFetch(`/organizations/${organizationId}/dashboard`);
}