import { apiFetch } from "./client";

export async function getEnvironmentsByOrganization(organizationId) {
  return apiFetch(`/organizations/${organizationId}/environments`);
}