import { apiFetch } from "./client";

export async function getPoliciesByOrganization(organizationId) {
  return apiFetch(`/organizations/${organizationId}/policies`);
}